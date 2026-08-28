package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/chatplatform/allocationservice/internal/adapters/postgres/generated"
	domain "github.com/chatplatform/allocationservice/internal/domain/allocation"
	"github.com/chatplatform/allocationservice/internal/ports"
)

const uniqueViolation = "23505"

// AllocationRepository implements ports.AllocationRepository with sqlc over
// pgx. Every method applies the configured query timeout and joins an active
// transaction when one is in context.
type AllocationRepository struct {
	pool         *pgxpool.Pool
	queryTimeout time.Duration
}

// NewAllocationRepository wires the repository.
func NewAllocationRepository(pool *pgxpool.Pool, queryTimeout time.Duration) *AllocationRepository {
	return &AllocationRepository{pool: pool, queryTimeout: queryTimeout}
}

// queries returns sqlc queries bound to the in-context transaction when
// present, or the pool otherwise.
func (r *AllocationRepository) queries(ctx context.Context) *generated.Queries {
	if tx, ok := ctx.Value(txKey{}).(pgx.Tx); ok {
		return generated.New(tx)
	}
	return generated.New(r.pool)
}

func (r *AllocationRepository) withTimeout(ctx context.Context) (context.Context, context.CancelFunc) {
	if r.queryTimeout <= 0 {
		return ctx, func() {}
	}
	return context.WithTimeout(ctx, r.queryTimeout)
}

// Create inserts the aggregate; the (tenant_id, request_id) unique index
// translates to domain.ErrAlreadyExists.
func (r *AllocationRepository) Create(ctx context.Context, a domain.Allocation) error {
	ctx, cancel := r.withTimeout(ctx)
	defer cancel()
	id, err := uuid.Parse(string(a.ID))
	if err != nil {
		return fmt.Errorf("%w: id is not a uuid", domain.ErrInvalidArgument)
	}
	err = r.queries(ctx).CreateAllocation(ctx, generated.CreateAllocationParams{
		ID:         id,
		TenantID:   string(a.TenantID),
		RequestID:  string(a.RequestID),
		ResourceID: string(a.ResourceID),
		Status:     string(a.Status),
		Priority:   a.Priority,
		CreatedAt:  toTimestamptz(a.CreatedAt),
		UpdatedAt:  toTimestamptz(a.UpdatedAt),
		ExpiresAt:  toTimestamptz(a.ExpiresAt),
		Version:    a.Version,
	})
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == uniqueViolation {
		return domain.ErrAlreadyExists
	}
	if err != nil {
		return fmt.Errorf("create allocation: %w", err)
	}
	return nil
}

// Get returns the tenant's allocation or domain.ErrNotFound.
func (r *AllocationRepository) Get(ctx context.Context, tenantID domain.TenantID, id domain.ID) (domain.Allocation, error) {
	ctx, cancel := r.withTimeout(ctx)
	defer cancel()
	uid, err := uuid.Parse(string(id))
	if err != nil {
		return domain.Allocation{}, domain.ErrNotFound // malformed id can never match
	}
	row, err := r.queries(ctx).GetAllocation(ctx, generated.GetAllocationParams{
		TenantID: string(tenantID),
		ID:       uid,
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Allocation{}, domain.ErrNotFound
	}
	if err != nil {
		return domain.Allocation{}, fmt.Errorf("get allocation: %w", err)
	}
	return toDomain(row), nil
}

// GetByRequestID resolves the idempotent identity within the tenant.
func (r *AllocationRepository) GetByRequestID(ctx context.Context, tenantID domain.TenantID, requestID domain.RequestID) (domain.Allocation, error) {
	ctx, cancel := r.withTimeout(ctx)
	defer cancel()
	row, err := r.queries(ctx).GetAllocationByRequestID(ctx, generated.GetAllocationByRequestIDParams{
		TenantID:  string(tenantID),
		RequestID: string(requestID),
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Allocation{}, domain.ErrNotFound
	}
	if err != nil {
		return domain.Allocation{}, fmt.Errorf("get allocation by request id: %w", err)
	}
	return toDomain(row), nil
}

// List returns one keyset page (created_at DESC, id DESC). It fetches
// pageSize+1 rows to learn whether more pages exist without a COUNT.
func (r *AllocationRepository) List(ctx context.Context, tenantID domain.TenantID, q ports.ListQuery) (ports.Page, error) {
	ctx, cancel := r.withTimeout(ctx)
	defer cancel()
	limit := q.PageSize + 1
	var rows []generated.Allocation
	var err error
	switch {
	case q.Status == "" && q.After.IsZero():
		rows, err = r.queries(ctx).ListAllocationsFirstPage(ctx, generated.ListAllocationsFirstPageParams{
			TenantID: string(tenantID), Limit: limit,
		})
	case q.Status == "":
		var afterID uuid.UUID
		if afterID, err = uuid.Parse(string(q.After.ID)); err != nil {
			return ports.Page{}, fmt.Errorf("%w: malformed page token", domain.ErrInvalidArgument)
		}
		rows, err = r.queries(ctx).ListAllocationsAfter(ctx, generated.ListAllocationsAfterParams{
			TenantID: string(tenantID), AfterCreatedAt: toTimestamptz(q.After.CreatedAt),
			AfterID: afterID, PageLimit: limit,
		})
	case q.After.IsZero():
		rows, err = r.queries(ctx).ListAllocationsByStatusFirstPage(ctx, generated.ListAllocationsByStatusFirstPageParams{
			TenantID: string(tenantID), Status: string(q.Status), Limit: limit,
		})
	default:
		var afterID uuid.UUID
		if afterID, err = uuid.Parse(string(q.After.ID)); err != nil {
			return ports.Page{}, fmt.Errorf("%w: malformed page token", domain.ErrInvalidArgument)
		}
		rows, err = r.queries(ctx).ListAllocationsByStatusAfter(ctx, generated.ListAllocationsByStatusAfterParams{
			TenantID: string(tenantID), Status: string(q.Status),
			AfterCreatedAt: toTimestamptz(q.After.CreatedAt), AfterID: afterID, PageLimit: limit,
		})
	}
	if err != nil {
		return ports.Page{}, fmt.Errorf("list allocations: %w", err)
	}

	page := ports.Page{}
	if int32(len(rows)) > q.PageSize {
		rows = rows[:q.PageSize]
		page.HasMore = true
	}
	page.Items = make([]domain.Allocation, 0, len(rows))
	for _, row := range rows {
		page.Items = append(page.Items, toDomain(row))
	}
	if page.HasMore {
		last := page.Items[len(page.Items)-1]
		page.Next = ports.Cursor{CreatedAt: last.CreatedAt, ID: last.ID}
	}
	return page, nil
}

// Update writes the transitioned aggregate guarded by expectedVersion.
func (r *AllocationRepository) Update(ctx context.Context, a domain.Allocation, expectedVersion int64) error {
	ctx, cancel := r.withTimeout(ctx)
	defer cancel()
	id, err := uuid.Parse(string(a.ID))
	if err != nil {
		return domain.ErrNotFound
	}
	affected, err := r.queries(ctx).UpdateAllocationGuarded(ctx, generated.UpdateAllocationGuardedParams{
		Status:    string(a.Status),
		UpdatedAt: toTimestamptz(a.UpdatedAt),
		Version:   a.Version,
		TenantID:  string(a.TenantID),
		ID:        id,
		Version_2: expectedVersion,
	})
	if err != nil {
		return fmt.Errorf("update allocation: %w", err)
	}
	if affected == 0 {
		// Distinguish "row gone / other tenant" from "stale version".
		if _, getErr := r.Get(ctx, a.TenantID, a.ID); errors.Is(getErr, domain.ErrNotFound) {
			return domain.ErrNotFound
		}
		return domain.ErrVersionConflict
	}
	return nil
}

func toTimestamptz(t time.Time) pgtype.Timestamptz {
	if t.IsZero() {
		return pgtype.Timestamptz{} // NULL
	}
	return pgtype.Timestamptz{Time: t.UTC(), Valid: true}
}

func fromTimestamptz(t pgtype.Timestamptz) time.Time {
	if !t.Valid {
		return time.Time{}
	}
	return t.Time.UTC()
}

// toDomain maps the persistence row to the domain aggregate - the only place
// sqlc types meet domain types.
func toDomain(row generated.Allocation) domain.Allocation {
	return domain.Allocation{
		ID:         domain.ID(row.ID.String()),
		TenantID:   domain.TenantID(row.TenantID),
		RequestID:  domain.RequestID(row.RequestID),
		ResourceID: domain.ResourceID(row.ResourceID),
		Status:     domain.Status(row.Status),
		Priority:   row.Priority,
		CreatedAt:  fromTimestamptz(row.CreatedAt),
		UpdatedAt:  fromTimestamptz(row.UpdatedAt),
		ExpiresAt:  fromTimestamptz(row.ExpiresAt),
		Version:    row.Version,
	}
}
