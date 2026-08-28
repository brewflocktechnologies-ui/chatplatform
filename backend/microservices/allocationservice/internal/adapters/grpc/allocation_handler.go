// Package grpc is the transport adapter: protovalidate at the boundary,
// proto <-> application DTO mapping, and centralized domain-error -> status
// translation. No business rules live here.
package grpc

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"buf.build/go/protovalidate"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/timestamppb"

	allocationv1 "github.com/chatplatform/allocationservice/gen/proto/allocation/v1"
	app "github.com/chatplatform/allocationservice/internal/application/allocation"
	"github.com/chatplatform/allocationservice/internal/adapters/grpc/interceptors"
	domain "github.com/chatplatform/allocationservice/internal/domain/allocation"
)

// AllocationHandler implements allocation.v1.AllocationService.
type AllocationHandler struct {
	allocationv1.UnimplementedAllocationServiceServer
	app       *app.Service
	validator protovalidate.Validator
	logger    *slog.Logger
}

// NewAllocationHandler wires the transport handler.
func NewAllocationHandler(service *app.Service, logger *slog.Logger) (*AllocationHandler, error) {
	v, err := protovalidate.New()
	if err != nil {
		return nil, err
	}
	return &AllocationHandler{app: service, validator: v, logger: logger}, nil
}

// CreateAllocation is idempotent on (tenant, request_id).
func (h *AllocationHandler) CreateAllocation(ctx context.Context, req *allocationv1.CreateAllocationRequest) (*allocationv1.CreateAllocationResponse, error) {
	tenant, err := h.requireTenant(ctx)
	if err != nil {
		return nil, err
	}
	if err := h.validate(req); err != nil {
		return nil, err
	}
	var expiresAt time.Time
	if req.GetExpiresAt() != nil {
		expiresAt = req.GetExpiresAt().AsTime()
	}
	result, err := h.app.Create(ctx, app.CreateCommand{
		TenantID:   tenant,
		RequestID:  req.GetRequestId(),
		ResourceID: req.GetResourceId(),
		Priority:   req.GetPriority(),
		ExpiresAt:  expiresAt,
	})
	if err != nil {
		return nil, h.mapError(ctx, err)
	}
	return &allocationv1.CreateAllocationResponse{
		Allocation: toProto(result.Allocation),
		Replayed:   result.Replayed,
	}, nil
}

// GetAllocation fetches one allocation within the caller's tenant.
func (h *AllocationHandler) GetAllocation(ctx context.Context, req *allocationv1.GetAllocationRequest) (*allocationv1.GetAllocationResponse, error) {
	tenant, err := h.requireTenant(ctx)
	if err != nil {
		return nil, err
	}
	if err := h.validate(req); err != nil {
		return nil, err
	}
	dto, err := h.app.Get(ctx, app.GetQuery{TenantID: tenant, AllocationID: req.GetAllocationId()})
	if err != nil {
		return nil, h.mapError(ctx, err)
	}
	return &allocationv1.GetAllocationResponse{Allocation: toProto(dto)}, nil
}

// ListAllocations returns one cursor page.
func (h *AllocationHandler) ListAllocations(ctx context.Context, req *allocationv1.ListAllocationsRequest) (*allocationv1.ListAllocationsResponse, error) {
	tenant, err := h.requireTenant(ctx)
	if err != nil {
		return nil, err
	}
	if err := h.validate(req); err != nil {
		return nil, err
	}
	var statusFilter string
	if req.GetStatus() != allocationv1.AllocationStatus_ALLOCATION_STATUS_UNSPECIFIED {
		statusFilter = statusFromProto(req.GetStatus())
	}
	page, err := h.app.List(ctx, app.ListQuery{
		TenantID:  tenant,
		PageSize:  req.GetPageSize(),
		PageToken: req.GetPageToken(),
		Status:    statusFilter,
	})
	if err != nil {
		return nil, h.mapError(ctx, err)
	}
	resp := &allocationv1.ListAllocationsResponse{NextPageToken: page.NextPageToken}
	for _, item := range page.Items {
		resp.Allocations = append(resp.Allocations, toProto(item))
	}
	return resp, nil
}

// Allocate runs PENDING -> ALLOCATED.
func (h *AllocationHandler) Allocate(ctx context.Context, req *allocationv1.AllocateRequest) (*allocationv1.AllocateResponse, error) {
	dto, err := h.transition(ctx, req, req.GetAllocationId(), req.GetVersion(), h.app.Allocate)
	if err != nil {
		return nil, err
	}
	return &allocationv1.AllocateResponse{Allocation: toProto(dto)}, nil
}

// ReleaseAllocation runs ALLOCATED -> RELEASED.
func (h *AllocationHandler) ReleaseAllocation(ctx context.Context, req *allocationv1.ReleaseAllocationRequest) (*allocationv1.ReleaseAllocationResponse, error) {
	dto, err := h.transition(ctx, req, req.GetAllocationId(), req.GetVersion(), h.app.Release)
	if err != nil {
		return nil, err
	}
	return &allocationv1.ReleaseAllocationResponse{Allocation: toProto(dto)}, nil
}

// CompleteAllocation runs ALLOCATED -> COMPLETED.
func (h *AllocationHandler) CompleteAllocation(ctx context.Context, req *allocationv1.CompleteAllocationRequest) (*allocationv1.CompleteAllocationResponse, error) {
	dto, err := h.transition(ctx, req, req.GetAllocationId(), req.GetVersion(), h.app.Complete)
	if err != nil {
		return nil, err
	}
	return &allocationv1.CompleteAllocationResponse{Allocation: toProto(dto)}, nil
}

func (h *AllocationHandler) transition(ctx context.Context, req proto.Message, id string, version int64, op func(context.Context, app.TransitionCommand) (app.DTO, error)) (app.DTO, error) {
	tenant, err := h.requireTenant(ctx)
	if err != nil {
		return app.DTO{}, err
	}
	if err := h.validate(req); err != nil {
		return app.DTO{}, err
	}
	dto, err := op(ctx, app.TransitionCommand{TenantID: tenant, AllocationID: id, Version: version})
	if err != nil {
		return app.DTO{}, h.mapError(ctx, err)
	}
	return dto, nil
}

func (h *AllocationHandler) requireTenant(ctx context.Context) (string, error) {
	tenant := interceptors.TenantFromContext(ctx)
	if tenant == "" {
		return "", status.Error(codes.Unauthenticated, "missing tenant identity")
	}
	return tenant, nil
}

func (h *AllocationHandler) validate(msg proto.Message) error {
	if err := h.validator.Validate(msg); err != nil {
		// protovalidate messages are field-level and safe to expose.
		return status.Error(codes.InvalidArgument, err.Error())
	}
	return nil
}

// mapError is the single place domain/application errors become gRPC status
// codes. Anything unrecognized is logged with full detail and surfaced as a
// bare Internal - no SQL, stack traces or infrastructure detail crosses the
// API.
func (h *AllocationHandler) mapError(ctx context.Context, err error) error {
	switch {
	case errors.Is(err, domain.ErrNotFound):
		return status.Error(codes.NotFound, "allocation not found")
	case errors.Is(err, domain.ErrAlreadyExists):
		return status.Error(codes.AlreadyExists, "allocation already exists")
	case errors.Is(err, domain.ErrVersionConflict):
		return status.Error(codes.Aborted, "version conflict: reload and retry with the current version")
	case errors.Is(err, domain.ErrInvalidTransition):
		return status.Error(codes.FailedPrecondition, err.Error())
	case errors.Is(err, domain.ErrInvalidArgument):
		return status.Error(codes.InvalidArgument, err.Error())
	case errors.Is(err, context.DeadlineExceeded):
		return status.Error(codes.DeadlineExceeded, "operation timed out")
	case errors.Is(err, context.Canceled):
		return status.Error(codes.Canceled, "operation canceled")
	default:
		h.logger.ErrorContext(ctx, "internal error",
			slog.String("error", err.Error()),
			slog.String("request_id", interceptors.RequestIDFromContext(ctx)),
		)
		return status.Error(codes.Internal, "internal error")
	}
}

func toProto(d app.DTO) *allocationv1.Allocation {
	out := &allocationv1.Allocation{
		Id:         d.ID,
		TenantId:   d.TenantID,
		RequestId:  d.RequestID,
		ResourceId: d.ResourceID,
		Status:     statusToProto(d.Status),
		Priority:   d.Priority,
		CreatedAt:  timestamppb.New(d.CreatedAt),
		UpdatedAt:  timestamppb.New(d.UpdatedAt),
		Version:    d.Version,
	}
	if !d.ExpiresAt.IsZero() {
		out.ExpiresAt = timestamppb.New(d.ExpiresAt)
	}
	return out
}

var statusToProtoMap = map[string]allocationv1.AllocationStatus{
	"PENDING":   allocationv1.AllocationStatus_ALLOCATION_STATUS_PENDING,
	"ALLOCATED": allocationv1.AllocationStatus_ALLOCATION_STATUS_ALLOCATED,
	"RELEASED":  allocationv1.AllocationStatus_ALLOCATION_STATUS_RELEASED,
	"COMPLETED": allocationv1.AllocationStatus_ALLOCATION_STATUS_COMPLETED,
	"EXPIRED":   allocationv1.AllocationStatus_ALLOCATION_STATUS_EXPIRED,
	"FAILED":    allocationv1.AllocationStatus_ALLOCATION_STATUS_FAILED,
}

func statusToProto(s string) allocationv1.AllocationStatus {
	return statusToProtoMap[s] // zero value = UNSPECIFIED for unknown
}

func statusFromProto(s allocationv1.AllocationStatus) string {
	for name, v := range statusToProtoMap {
		if v == s {
			return name
		}
	}
	return ""
}
