package ports

// BusinessMetrics is the thin port the application layer uses to record
// domain-level counters without depending on any metrics vendor. Labels are
// deliberately absent: business counters stay low-cardinality by design.
type BusinessMetrics interface {
	IncCreated()
	IncAllocated()
	IncReleased()
	IncCompleted()
	IncConflict()
	IncIdempotencyReplay()
}

// NopMetrics is the do-nothing default (tests, metrics-disabled runs).
type NopMetrics struct{}

func (NopMetrics) IncCreated()           {}
func (NopMetrics) IncAllocated()         {}
func (NopMetrics) IncReleased()          {}
func (NopMetrics) IncCompleted()         {}
func (NopMetrics) IncConflict()          {}
func (NopMetrics) IncIdempotencyReplay() {}
