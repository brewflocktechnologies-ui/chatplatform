# ADR-008: Optimistic concurrency via version column

**Status**: accepted

Every state change: load -> domain transition (bumps version) -> `UPDATE ...
WHERE version = expected`. Zero rows = ABORTED to the caller, who reloads
and retries. Callers must echo the version they saw, making lost updates
impossible rather than merely unlikely. Chosen over SELECT FOR UPDATE
(pessimistic) because contention is expected to be low and holding row locks
across application logic hurts tail latency. Verified by concurrency tests:
N racers, exactly one winner, at fake-repo, real-DB and gRPC levels.
