package ports

import "time"

// Clock abstracts time so domain/application logic is deterministic under
// test. Always UTC.
type Clock interface {
	Now() time.Time
}

// ClockFunc adapts a func to Clock.
type ClockFunc func() time.Time

// Now implements Clock.
func (f ClockFunc) Now() time.Time { return f() }

// SystemClock is the production clock.
var SystemClock Clock = ClockFunc(func() time.Time { return time.Now().UTC() })
