package allocation

// Status is the allocation lifecycle state. The zero value is intentionally
// invalid so an unset status can never masquerade as a real one.
type Status string

const (
	StatusPending   Status = "PENDING"
	StatusAllocated Status = "ALLOCATED"
	StatusReleased  Status = "RELEASED"
	StatusCompleted Status = "COMPLETED"
	StatusExpired   Status = "EXPIRED"
	StatusFailed    Status = "FAILED"
)

// validTransitions is the single source of truth for the lifecycle:
//
//	PENDING ──> ALLOCATED ──> RELEASED
//	   │             └──────> COMPLETED
//	   ├──> EXPIRED
//	   └──> FAILED
//
// RELEASED, COMPLETED, EXPIRED and FAILED are terminal.
var validTransitions = map[Status][]Status{
	StatusPending:   {StatusAllocated, StatusExpired, StatusFailed},
	StatusAllocated: {StatusReleased, StatusCompleted},
}

// CanTransition reports whether from -> to is a legal lifecycle step.
func CanTransition(from, to Status) bool {
	for _, allowed := range validTransitions[from] {
		if allowed == to {
			return true
		}
	}
	return false
}

// IsValid reports whether s is one of the defined statuses.
func (s Status) IsValid() bool {
	switch s {
	case StatusPending, StatusAllocated, StatusReleased, StatusCompleted, StatusExpired, StatusFailed:
		return true
	}
	return false
}

// IsTerminal reports whether no further transitions are possible.
func (s Status) IsTerminal() bool {
	return s.IsValid() && len(validTransitions[s]) == 0
}
