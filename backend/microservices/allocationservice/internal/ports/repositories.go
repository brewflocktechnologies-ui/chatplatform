// Package ports declares the interfaces the application core needs from the
// outside world. Infrastructure adapters implement them; the core never
// imports an adapter.
package ports

import (
	"context"
	"time"

	"github.com/chatplatform/allocationservice/internal/domain/allocation"
)

// ListQuery is a tenant-scoped, cursor-based listing request.
type ListQuery struct {
	// PageSize is already clamped/validated by the caller.
	PageSize int32
	// After is the exclusive cursor position; zero value means first page.
	After Cursor
	// Status filters when non-empty.
	Status allocation.Status
}

// Cursor is the keyset position for deterministic (created_at DESC, id DESC)
// pagination.
type Cursor struct {
	CreatedAt time.Time
	ID        allocation.ID
}

// IsZero reports whether the cursor is unset (first page).
func (c Cursor) IsZero() bool { return c.CreatedAt.IsZero() && c.ID == "" }

// Page is one page of results plus the cursor of its last row (the caller
// turns it into an opaque token when HasMore).
type Page struct {
	Items   []allocation.Allocation
	Next    Cursor
	HasMore bool
}

// AllocationRepository is the persistence port for the Allocation aggregate.
// Every method is tenant-scoped: an id belonging to another tenant behaves
// exactly like a missing row (allocation.ErrNotFound).
type AllocationRepository interface {
	// Create persists a new aggregate. Returns allocation.ErrAlreadyExists
	// when the tenant already has an allocation with the same RequestID -
	// the database uniqueness constraint is the race-proof idempotency
	// guard, not a pre-check.
	Create(ctx context.Context, a allocation.Allocation) error

	// Get returns the aggregate or allocation.ErrNotFound.
	Get(ctx context.Context, tenantID allocation.TenantID, id allocation.ID) (allocation.Allocation, error)

	// GetByRequestID resolves the idempotent identity (tenant + request_id).
	GetByRequestID(ctx context.Context, tenantID allocation.TenantID, requestID allocation.RequestID) (allocation.Allocation, error)

	// List returns one page ordered created_at DESC, id DESC.
	List(ctx context.Context, tenantID allocation.TenantID, q ListQuery) (Page, error)

	// Update persists an already-transitioned aggregate guarded by optimistic
	// concurrency: the row is written only where version = expectedVersion.
	// Zero rows updated => allocation.ErrVersionConflict (or ErrNotFound if
	// the row does not exist for this tenant at all).
	Update(ctx context.Context, a allocation.Allocation, expectedVersion int64) error
}
