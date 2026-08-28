package allocation

import (
	"time"

	domain "github.com/chatplatform/allocationservice/internal/domain/allocation"
)

// DTO is the application-layer view of an allocation - what transports map
// to their own wire formats. Domain and persistence types never cross this
// boundary.
type DTO struct {
	ID         string
	TenantID   string
	RequestID  string
	ResourceID string
	Status     string
	Priority   int32
	CreatedAt  time.Time
	UpdatedAt  time.Time
	// ExpiresAt zero = never expires.
	ExpiresAt time.Time
	Version   int64
}

// CreateResult is DTO plus whether this create was an idempotent replay.
type CreateResult struct {
	Allocation DTO
	Replayed   bool
}

// PageDTO is one page of allocations plus the opaque cursor for the next.
type PageDTO struct {
	Items         []DTO
	NextPageToken string
}

func toDTO(a domain.Allocation) DTO {
	return DTO{
		ID:         string(a.ID),
		TenantID:   string(a.TenantID),
		RequestID:  string(a.RequestID),
		ResourceID: string(a.ResourceID),
		Status:     string(a.Status),
		Priority:   a.Priority,
		CreatedAt:  a.CreatedAt,
		UpdatedAt:  a.UpdatedAt,
		ExpiresAt:  a.ExpiresAt,
		Version:    a.Version,
	}
}
