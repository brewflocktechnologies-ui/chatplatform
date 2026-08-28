package integration

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"

	domain "github.com/chatplatform/allocationservice/internal/domain/allocation"
	"github.com/chatplatform/allocationservice/internal/ports"
)

func mustNew(t *testing.T, tenant, reqID string, createdAt time.Time) domain.Allocation {
	t.Helper()
	a, err := domain.New(
		domain.ID(uuid.Must(uuid.NewV7()).String()),
		domain.TenantID(tenant), domain.RequestID(reqID), "res-1", 10, time.Time{}, createdAt,
	)
	if err != nil {
		t.Fatal(err)
	}
	return a
}

func TestRepositoryCreateAndGetRoundTrip(t *testing.T) {
	requireDB(t)
	ctx := context.Background()
	a := mustNew(t, "t1", "req-1", time.Now().UTC())

	if err := repo.Create(ctx, a); err != nil {
		t.Fatal(err)
	}
	got, err := repo.Get(ctx, a.TenantID, a.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got.RequestID != a.RequestID || got.Status != domain.StatusPending || got.Version != 1 {
		t.Fatalf("round-trip mismatch: %+v", got)
	}
	// timestamptz keeps microseconds; equality within 1ms proves UTC round-trip.
	if got.CreatedAt.Sub(a.CreatedAt).Abs() > time.Millisecond {
		t.Errorf("created_at drifted: %v vs %v", got.CreatedAt, a.CreatedAt)
	}
}

func TestRepositoryUniqueConstraintOnTenantRequest(t *testing.T) {
	requireDB(t)
	ctx := context.Background()
	a := mustNew(t, "t1", "dup-req", time.Now().UTC())
	b := mustNew(t, "t1", "dup-req", time.Now().UTC()) // same tenant+request, new id

	if err := repo.Create(ctx, a); err != nil {
		t.Fatal(err)
	}
	if err := repo.Create(ctx, b); !errors.Is(err, domain.ErrAlreadyExists) {
		t.Fatalf("err = %v, want ErrAlreadyExists", err)
	}
	// Same request id under ANOTHER tenant is fine.
	c := mustNew(t, "t2", "dup-req", time.Now().UTC())
	if err := repo.Create(ctx, c); err != nil {
		t.Fatalf("cross-tenant same request_id should insert: %v", err)
	}
}

func TestRepositoryTenantIsolation(t *testing.T) {
	requireDB(t)
	ctx := context.Background()
	a := mustNew(t, "t1", "req-1", time.Now().UTC())
	if err := repo.Create(ctx, a); err != nil {
		t.Fatal(err)
	}
	if _, err := repo.Get(ctx, "t2", a.ID); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("cross-tenant get: err = %v, want ErrNotFound", err)
	}
	// Cross-tenant guarded update must not touch the row.
	stolen := a
	stolen.TenantID = "t2"
	stolen.Status = domain.StatusAllocated
	stolen.Version = 2
	if err := repo.Update(ctx, stolen, 1); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("cross-tenant update: err = %v, want ErrNotFound", err)
	}
	got, _ := repo.Get(ctx, "t1", a.ID)
	if got.Status != domain.StatusPending {
		t.Fatal("cross-tenant update mutated the row")
	}
}

func TestRepositoryOptimisticConcurrencyOnDatabase(t *testing.T) {
	requireDB(t)
	ctx := context.Background()
	a := mustNew(t, "t1", "req-1", time.Now().UTC())
	if err := repo.Create(ctx, a); err != nil {
		t.Fatal(err)
	}

	// True DB race: N workers all try version 1 -> exactly one row update wins.
	const workers = 8
	var wins atomic.Int32
	var wg sync.WaitGroup
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			updated := a
			updated.Status = domain.StatusAllocated
			updated.UpdatedAt = time.Now().UTC()
			updated.Version = 2
			err := repo.Update(ctx, updated, 1)
			switch {
			case err == nil:
				wins.Add(1)
			case errors.Is(err, domain.ErrVersionConflict):
			default:
				t.Errorf("unexpected error: %v", err)
			}
		}()
	}
	wg.Wait()
	if wins.Load() != 1 {
		t.Fatalf("%d guarded updates won, want exactly 1", wins.Load())
	}
	got, _ := repo.Get(ctx, "t1", a.ID)
	if got.Version != 2 || got.Status != domain.StatusAllocated {
		t.Fatalf("final row: version=%d status=%s", got.Version, got.Status)
	}
}

func TestTransactionRollsBackOnError(t *testing.T) {
	requireDB(t)
	ctx := context.Background()
	a := mustNew(t, "t1", "req-tx", time.Now().UTC())

	sentinel := errors.New("boom")
	err := tx.WithinTx(ctx, func(ctx context.Context) error {
		if err := repo.Create(ctx, a); err != nil {
			return err
		}
		return sentinel // force rollback AFTER a successful insert
	})
	if !errors.Is(err, sentinel) {
		t.Fatalf("err = %v", err)
	}
	if _, err := repo.Get(ctx, a.TenantID, a.ID); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("row survived rollback: err = %v", err)
	}
}

func TestRepositoryPaginationAgainstRealIndexes(t *testing.T) {
	requireDB(t)
	ctx := context.Background()
	base := time.Now().UTC().Truncate(time.Millisecond)
	for i := 0; i < 7; i++ {
		a := mustNew(t, "t1", fmt.Sprintf("req-%d", i), base.Add(time.Duration(i)*time.Millisecond))
		if err := repo.Create(ctx, a); err != nil {
			t.Fatal(err)
		}
	}
	// Another tenant's rows must never appear.
	other := mustNew(t, "t2", "req-other", base)
	if err := repo.Create(ctx, other); err != nil {
		t.Fatal(err)
	}

	seen := map[domain.ID]bool{}
	var cursor ports.Cursor
	pages := 0
	for {
		page, err := repo.List(ctx, "t1", ports.ListQuery{PageSize: 3, After: cursor})
		if err != nil {
			t.Fatal(err)
		}
		pages++
		var prev *domain.Allocation
		for i := range page.Items {
			item := page.Items[i]
			if item.TenantID != "t1" {
				t.Fatalf("foreign tenant row leaked: %+v", item)
			}
			if seen[item.ID] {
				t.Fatalf("duplicate item across pages: %s", item.ID)
			}
			seen[item.ID] = true
			if prev != nil && item.CreatedAt.After(prev.CreatedAt) {
				t.Fatal("ordering violated: expected created_at DESC")
			}
			prev = &item
		}
		if !page.HasMore {
			break
		}
		cursor = page.Next
	}
	if len(seen) != 7 || pages != 3 {
		t.Fatalf("saw %d rows over %d pages, want 7 over 3", len(seen), pages)
	}
}
