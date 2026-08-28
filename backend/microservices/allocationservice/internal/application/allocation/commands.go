package allocation

import "time"

// CreateCommand carries everything needed to create an allocation. TenantID
// comes from authenticated request context, never from the request body.
type CreateCommand struct {
	TenantID   string
	RequestID  string
	ResourceID string
	Priority   int32
	// ExpiresAt zero = never expires.
	ExpiresAt time.Time
}

// TransitionCommand drives one lifecycle command (Allocate / Release /
// Complete) with the caller's optimistic-concurrency guard.
type TransitionCommand struct {
	TenantID     string
	AllocationID string
	// Version the caller last observed; a mismatch aborts the command.
	Version int64
}
