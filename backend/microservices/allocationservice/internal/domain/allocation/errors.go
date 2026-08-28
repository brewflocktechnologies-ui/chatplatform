package allocation

import (
	"errors"
	"fmt"
)

// Sentinel domain errors. Layers above map these to transport codes; the
// domain itself knows nothing about gRPC.
var (
	// ErrNotFound: no allocation with that identity visible to the tenant.
	// Deliberately also returned for cross-tenant access - revealing that an
	// id exists in another tenant is itself a leak.
	ErrNotFound = errors.New("allocation not found")

	// ErrAlreadyExists: a different allocation already occupies this logical
	// identity (tenant + request_id) - distinct from an idempotent replay,
	// which is not an error.
	ErrAlreadyExists = errors.New("allocation already exists")

	// ErrVersionConflict: the caller acted on a stale version; reload and retry.
	ErrVersionConflict = errors.New("allocation version conflict")

	// ErrInvalidArgument: a domain value is malformed or out of range.
	ErrInvalidArgument = errors.New("invalid argument")
)

// InvalidTransitionError is returned when a lifecycle rule forbids the
// requested state change. It wraps no infrastructure detail - just the facts
// a caller needs to understand and report the violation.
type InvalidTransitionError struct {
	From Status
	To   Status
}

func (e InvalidTransitionError) Error() string {
	return fmt.Sprintf("invalid allocation state transition %s -> %s", e.From, e.To)
}

// Is makes errors.Is(err, ErrInvalidTransition) work without allocating a
// sentinel per pair.
func (e InvalidTransitionError) Is(target error) bool { return target == ErrInvalidTransition }

// ErrInvalidTransition is the class of all InvalidTransitionError values.
var ErrInvalidTransition = errors.New("invalid allocation state transition")
