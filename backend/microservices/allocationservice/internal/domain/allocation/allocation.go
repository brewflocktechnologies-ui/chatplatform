// Package allocation is the pure domain model. It depends only on the Go
// standard library - no gRPC, protobuf, pgx, sqlc, OTel or logging - and is
// unit-testable in isolation.
package allocation

import (
	"fmt"
	"strings"
	"time"
)

// TenantID identifies the owning tenant. Every operation is scoped by it.
type TenantID string

// ID identifies one allocation (a UUID in practice; the domain only requires
// non-emptiness and treats it as opaque).
type ID string

// RequestID is the client-chosen logical identity of a create request - the
// idempotency key within a tenant.
type RequestID string

// ResourceID identifies the resource being allocated.
type ResourceID string

const (
	maxIdentifierLen = 128
	// MaxPriority bounds priority; 0 is lowest.
	MaxPriority = 1000
)

// Allocation is the aggregate root. Fields are exported for mapping by outer
// layers, but every state change goes through methods that enforce the
// lifecycle - outer layers must never write Status directly.
type Allocation struct {
	ID         ID
	TenantID   TenantID
	RequestID  RequestID
	ResourceID ResourceID
	Status     Status
	Priority   int32
	CreatedAt  time.Time
	UpdatedAt  time.Time
	// ExpiresAt is zero when the allocation does not expire.
	ExpiresAt time.Time
	// Version is the optimistic-concurrency counter, starting at 1.
	Version int64
}

// New constructs a PENDING allocation, validating every domain invariant a
// brand-new aggregate must satisfy. now is injected (see ports.Clock) so the
// domain stays deterministic under test.
func New(id ID, tenantID TenantID, requestID RequestID, resourceID ResourceID, priority int32, expiresAt time.Time, now time.Time) (Allocation, error) {
	if err := validateIdentifier("id", string(id)); err != nil {
		return Allocation{}, err
	}
	if err := validateIdentifier("tenant_id", string(tenantID)); err != nil {
		return Allocation{}, err
	}
	if err := validateIdentifier("request_id", string(requestID)); err != nil {
		return Allocation{}, err
	}
	if err := validateIdentifier("resource_id", string(resourceID)); err != nil {
		return Allocation{}, err
	}
	if priority < 0 || priority > MaxPriority {
		return Allocation{}, fmt.Errorf("%w: priority %d outside [0, %d]", ErrInvalidArgument, priority, MaxPriority)
	}
	if !expiresAt.IsZero() && !expiresAt.After(now) {
		return Allocation{}, fmt.Errorf("%w: expires_at must be in the future", ErrInvalidArgument)
	}
	now = now.UTC()
	return Allocation{
		ID:         id,
		TenantID:   tenantID,
		RequestID:  requestID,
		ResourceID: resourceID,
		Status:     StatusPending,
		Priority:   priority,
		CreatedAt:  now,
		UpdatedAt:  now,
		ExpiresAt:  expiresAt,
		Version:    1,
	}, nil
}

// Allocate moves PENDING -> ALLOCATED. An allocation whose expiry has passed
// cannot be allocated even if the expirer has not flipped it yet.
func (a *Allocation) Allocate(now time.Time) error {
	if !a.ExpiresAt.IsZero() && !now.Before(a.ExpiresAt) {
		return InvalidTransitionError{From: StatusExpired, To: StatusAllocated}
	}
	return a.transition(StatusAllocated, now)
}

// Release moves ALLOCATED -> RELEASED (terminal).
func (a *Allocation) Release(now time.Time) error {
	return a.transition(StatusReleased, now)
}

// Complete moves ALLOCATED -> COMPLETED (terminal). By construction this
// enforces "cannot complete before allocated" and "a released allocation
// cannot be completed".
func (a *Allocation) Complete(now time.Time) error {
	return a.transition(StatusCompleted, now)
}

// Expire moves PENDING -> EXPIRED (terminal).
func (a *Allocation) Expire(now time.Time) error {
	return a.transition(StatusExpired, now)
}

// Fail moves PENDING -> FAILED (terminal).
func (a *Allocation) Fail(now time.Time) error {
	return a.transition(StatusFailed, now)
}

func (a *Allocation) transition(to Status, now time.Time) error {
	if !CanTransition(a.Status, to) {
		return InvalidTransitionError{From: a.Status, To: to}
	}
	a.Status = to
	a.UpdatedAt = now.UTC()
	a.Version++
	return nil
}

func validateIdentifier(field, value string) error {
	if strings.TrimSpace(value) == "" {
		return fmt.Errorf("%w: %s is required", ErrInvalidArgument, field)
	}
	if len(value) > maxIdentifierLen {
		return fmt.Errorf("%w: %s exceeds %d characters", ErrInvalidArgument, field, maxIdentifierLen)
	}
	return nil
}
