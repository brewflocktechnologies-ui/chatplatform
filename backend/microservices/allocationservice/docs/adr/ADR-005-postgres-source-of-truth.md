# ADR-005: PostgreSQL as the source of truth

**Status**: accepted

All allocation state lives in one PostgreSQL database: the unique constraint
is the idempotency guard, the version column the concurrency guard - both
enforced where concurrent writers actually meet. The service holds no state
in process memory, so any replica serves any request and horizontal scaling
is a replica-count change (see deployment.yaml, replicas: N).
