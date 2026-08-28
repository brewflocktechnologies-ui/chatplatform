// Package allocation (application) orchestrates the Allocation use cases:
// transaction boundaries, idempotency, repository interaction, and domain
// invocation. Business rules themselves live in the domain package.
package allocation

import (
	"context"
	"errors"
	"fmt"
	"time"

	domain "github.com/chatplatform/allocationservice/internal/domain/allocation"
	"github.com/chatplatform/allocationservice/internal/ports"
	"github.com/google/uuid"
)

// Service implements the Allocation use cases against the ports.
type Service struct {
	repo    ports.AllocationRepository
	tx      ports.TxManager
	clock   ports.Clock
	metrics ports.BusinessMetrics
	// newID generates allocation ids; injectable for deterministic tests.
	// UUIDv7 in production: time-ordered, so ids cluster with created_at in
	// the primary-key index and tie-break the pagination sort stably.
	newID func() string
}

// NewService wires the application service. Pass ports.NopMetrics when
// metrics are disabled.
func NewService(repo ports.AllocationRepository, tx ports.TxManager, clock ports.Clock, metrics ports.BusinessMetrics) *Service {
	return &Service{
		repo:    repo,
		tx:      tx,
		clock:   clock,
		metrics: metrics,
		newID: func() string {
			id, err := uuid.NewV7()
			if err != nil {
				// v7 only errors if crypto/rand fails - unrecoverable.
				panic(fmt.Sprintf("uuidv7: %v", err))
			}
			return id.String()
		},
	}
}

// Create creates an allocation idempotently. The database unique constraint
// on (tenant_id, request_id) is the race-proof guard: on a duplicate we load
// and return the existing aggregate as a replay instead of failing, so
// client/process retries are safe. No explicit transaction: it is a single
// INSERT, and the constraint - not a read-then-write - resolves races.
func (s *Service) Create(ctx context.Context, cmd CreateCommand) (CreateResult, error) {
	a, err := domain.New(
		domain.ID(s.newID()),
		domain.TenantID(cmd.TenantID),
		domain.RequestID(cmd.RequestID),
		domain.ResourceID(cmd.ResourceID),
		cmd.Priority,
		cmd.ExpiresAt,
		s.clock.Now(),
	)
	if err != nil {
		return CreateResult{}, err
	}

	if err := s.repo.Create(ctx, a); err != nil {
		if errors.Is(err, domain.ErrAlreadyExists) {
			existing, getErr := s.repo.GetByRequestID(ctx, a.TenantID, a.RequestID)
			if getErr != nil {
				return CreateResult{}, getErr
			}
			s.metrics.IncIdempotencyReplay()
			return CreateResult{Allocation: toDTO(existing), Replayed: true}, nil
		}
		return CreateResult{}, err
	}
	s.metrics.IncCreated()
	return CreateResult{Allocation: toDTO(a)}, nil
}

// Get returns one allocation within the caller's tenant.
func (s *Service) Get(ctx context.Context, q GetQuery) (DTO, error) {
	a, err := s.repo.Get(ctx, domain.TenantID(q.TenantID), domain.ID(q.AllocationID))
	if err != nil {
		return DTO{}, err
	}
	return toDTO(a), nil
}

// List returns one cursor page ordered created_at DESC, id DESC.
func (s *Service) List(ctx context.Context, q ListQuery) (PageDTO, error) {
	size := q.PageSize
	if size <= 0 {
		size = DefaultPageSize
	}
	if size > MaxPageSize {
		size = MaxPageSize
	}
	var status domain.Status
	if q.Status != "" {
		status = domain.Status(q.Status)
		if !status.IsValid() {
			return PageDTO{}, fmt.Errorf("%w: unknown status %q", domain.ErrInvalidArgument, q.Status)
		}
	}
	var after ports.Cursor
	if q.PageToken != "" {
		var err error
		if after, err = decodeCursor(q.PageToken); err != nil {
			return PageDTO{}, err
		}
	}

	page, err := s.repo.List(ctx, domain.TenantID(q.TenantID), ports.ListQuery{
		PageSize: size,
		After:    after,
		Status:   status,
	})
	if err != nil {
		return PageDTO{}, err
	}

	out := PageDTO{Items: make([]DTO, 0, len(page.Items))}
	for _, a := range page.Items {
		out.Items = append(out.Items, toDTO(a))
	}
	if page.HasMore {
		out.NextPageToken = encodeCursor(page.Next)
	}
	return out, nil
}

// Allocate runs PENDING -> ALLOCATED under optimistic concurrency.
func (s *Service) Allocate(ctx context.Context, cmd TransitionCommand) (DTO, error) {
	return s.transition(ctx, cmd, (*domain.Allocation).Allocate, s.metrics.IncAllocated)
}

// Release runs ALLOCATED -> RELEASED under optimistic concurrency.
func (s *Service) Release(ctx context.Context, cmd TransitionCommand) (DTO, error) {
	return s.transition(ctx, cmd, (*domain.Allocation).Release, s.metrics.IncReleased)
}

// Complete runs ALLOCATED -> COMPLETED under optimistic concurrency.
func (s *Service) Complete(ctx context.Context, cmd TransitionCommand) (DTO, error) {
	return s.transition(ctx, cmd, (*domain.Allocation).Complete, s.metrics.IncCompleted)
}

// transition is the shared load -> domain rule -> guarded write orchestration,
// wrapped in one transaction: the read and the version-guarded UPDATE commit
// or roll back together. Two layers of stale-detection cooperate:
//   - cmd.Version != loaded version: the caller is stale - fail before
//     touching the domain.
//   - the UPDATE's WHERE version = expected matching zero rows: someone won
//     the race between our read and write - ErrVersionConflict from the repo.
func (s *Service) transition(ctx context.Context, cmd TransitionCommand, step func(*domain.Allocation, time.Time) error, onSuccess func()) (DTO, error) {
	var result domain.Allocation
	err := s.tx.WithinTx(ctx, func(ctx context.Context) error {
		a, err := s.repo.Get(ctx, domain.TenantID(cmd.TenantID), domain.ID(cmd.AllocationID))
		if err != nil {
			return err
		}
		if a.Version != cmd.Version {
			return fmt.Errorf("%w: expected version %d, found %d", domain.ErrVersionConflict, cmd.Version, a.Version)
		}
		expected := a.Version
		if err := step(&a, s.clock.Now()); err != nil {
			return err
		}
		if err := s.repo.Update(ctx, a, expected); err != nil {
			return err
		}
		result = a
		return nil
	})
	if err != nil {
		if errors.Is(err, domain.ErrVersionConflict) {
			s.metrics.IncConflict()
		}
		return DTO{}, err
	}
	onSuccess()
	return toDTO(result), nil
}
