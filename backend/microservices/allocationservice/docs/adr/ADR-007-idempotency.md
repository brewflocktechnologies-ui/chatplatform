# ADR-007: Idempotency via tenant-scoped request_id

**Status**: accepted

`request_id` IS the idempotency key: the domain model already requires a
client-chosen logical request identity, so a separate idempotency-key store
would duplicate it. The UNIQUE(tenant_id, request_id) index makes duplicate
creates lose at the database - persistent, race-proof, replica-safe (never
an in-memory map). On conflict the service returns the existing allocation
with `replayed: true`. Idempotent: CreateAllocation (unlimited retries).
Transition RPCs are not blind-retry-idempotent but are safe: the version
guard turns a duplicate delivery into ABORTED, never a double transition.
