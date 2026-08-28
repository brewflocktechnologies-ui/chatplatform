package allocation

import (
	"errors"
	"testing"
	"time"
)

var now = time.Date(2026, 8, 29, 12, 0, 0, 0, time.UTC)

func newPending(t *testing.T) Allocation {
	t.Helper()
	a, err := New("alloc-1", "tenant-1", "req-1", "res-1", 10, time.Time{}, now)
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	return a
}

func TestNewValidatesInvariants(t *testing.T) {
	future := now.Add(time.Hour)
	tests := []struct {
		name       string
		id         ID
		tenantID   TenantID
		requestID  RequestID
		resourceID ResourceID
		priority   int32
		expiresAt  time.Time
		wantErr    error
	}{
		{"valid", "a", "t", "r", "res", 0, future, nil},
		{"valid without expiry", "a", "t", "r", "res", MaxPriority, time.Time{}, nil},
		{"missing id", "", "t", "r", "res", 0, future, ErrInvalidArgument},
		{"missing tenant", "a", "", "r", "res", 0, future, ErrInvalidArgument},
		{"blank tenant", "a", "   ", "r", "res", 0, future, ErrInvalidArgument},
		{"missing request id", "a", "t", "", "res", 0, future, ErrInvalidArgument},
		{"missing resource id", "a", "t", "r", "", 0, future, ErrInvalidArgument},
		{"negative priority", "a", "t", "r", "res", -1, future, ErrInvalidArgument},
		{"priority above max", "a", "t", "r", "res", MaxPriority + 1, future, ErrInvalidArgument},
		{"expiry in the past", "a", "t", "r", "res", 0, now.Add(-time.Second), ErrInvalidArgument},
		{"expiry exactly now", "a", "t", "r", "res", 0, now, ErrInvalidArgument},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			a, err := New(tt.id, tt.tenantID, tt.requestID, tt.resourceID, tt.priority, tt.expiresAt, now)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("err = %v, want %v", err, tt.wantErr)
			}
			if err == nil {
				if a.Status != StatusPending {
					t.Errorf("status = %s, want PENDING", a.Status)
				}
				if a.Version != 1 {
					t.Errorf("version = %d, want 1", a.Version)
				}
			}
		})
	}
}

func TestLifecycleTransitions(t *testing.T) {
	tests := []struct {
		name    string
		prepare func(*Allocation) error // bring aggregate to the starting state
		act     func(*Allocation) error
		wantErr bool
	}{
		{"pending -> allocated", nil, func(a *Allocation) error { return a.Allocate(now) }, false},
		{"pending -> expired", nil, func(a *Allocation) error { return a.Expire(now) }, false},
		{"pending -> failed", nil, func(a *Allocation) error { return a.Fail(now) }, false},
		{"pending -> released is invalid", nil, func(a *Allocation) error { return a.Release(now) }, true},
		{"pending -> completed is invalid (cannot complete before allocate)", nil,
			func(a *Allocation) error { return a.Complete(now) }, true},
		{"allocated -> released", func(a *Allocation) error { return a.Allocate(now) },
			func(a *Allocation) error { return a.Release(now) }, false},
		{"allocated -> completed", func(a *Allocation) error { return a.Allocate(now) },
			func(a *Allocation) error { return a.Complete(now) }, false},
		{"allocated -> allocated is invalid", func(a *Allocation) error { return a.Allocate(now) },
			func(a *Allocation) error { return a.Allocate(now) }, true},
		{"released -> completed is invalid", func(a *Allocation) error {
			if err := a.Allocate(now); err != nil {
				return err
			}
			return a.Release(now)
		}, func(a *Allocation) error { return a.Complete(now) }, true},
		{"completed -> released is invalid", func(a *Allocation) error {
			if err := a.Allocate(now); err != nil {
				return err
			}
			return a.Complete(now)
		}, func(a *Allocation) error { return a.Release(now) }, true},
		{"expired -> allocated is invalid", func(a *Allocation) error { return a.Expire(now) },
			func(a *Allocation) error { return a.Allocate(now) }, true},
		{"failed -> allocated is invalid", func(a *Allocation) error { return a.Fail(now) },
			func(a *Allocation) error { return a.Allocate(now) }, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			a := newPending(t)
			if tt.prepare != nil {
				if err := tt.prepare(&a); err != nil {
					t.Fatalf("prepare: %v", err)
				}
			}
			versionBefore := a.Version
			statusBefore := a.Status
			err := tt.act(&a)
			if tt.wantErr {
				if !errors.Is(err, ErrInvalidTransition) {
					t.Fatalf("err = %v, want ErrInvalidTransition", err)
				}
				if a.Version != versionBefore || a.Status != statusBefore {
					t.Error("failed transition must not mutate the aggregate")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if a.Version != versionBefore+1 {
				t.Errorf("version = %d, want %d (must bump on every transition)", a.Version, versionBefore+1)
			}
		})
	}
}

func TestAllocatePastExpiryIsRejected(t *testing.T) {
	a, err := New("a", "t", "r", "res", 0, now.Add(time.Minute), now)
	if err != nil {
		t.Fatal(err)
	}
	err = a.Allocate(now.Add(2 * time.Minute)) // expiry passed, expirer hasn't run yet
	if !errors.Is(err, ErrInvalidTransition) {
		t.Fatalf("err = %v, want ErrInvalidTransition", err)
	}
	if a.Status != StatusPending {
		t.Errorf("status = %s, want PENDING untouched", a.Status)
	}
}

func TestStatusHelpers(t *testing.T) {
	if Status("").IsValid() {
		t.Error("zero status must be invalid")
	}
	if !StatusCompleted.IsTerminal() || !StatusReleased.IsTerminal() ||
		!StatusExpired.IsTerminal() || !StatusFailed.IsTerminal() {
		t.Error("terminal statuses misreported")
	}
	if StatusPending.IsTerminal() || StatusAllocated.IsTerminal() {
		t.Error("non-terminal statuses misreported")
	}
}
