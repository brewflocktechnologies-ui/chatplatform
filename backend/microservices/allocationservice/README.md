# allocationservice

Production-ready Go domain microservice owning the **Allocation** aggregate:
tenant-aware resource allocations with a strict lifecycle, idempotent
creation, optimistic concurrency, and cursor pagination — exposed over a
versioned gRPC API. Stateless: any replica serves any request.

## Architecture

Hexagonal (ports & adapters). Dependencies point inward; infrastructure
implements ports. The domain imports only the standard library.

```text
        gRPC transport (internal/adapters/grpc)
   protovalidate | DTO mapping | error->status | interceptors
                        |
                        v
        Application (internal/application/allocation)
   use-case orchestration | tx boundary | idempotency | cursors
                        |
                        v
           Domain (internal/domain/allocation)
      lifecycle rules | invariants | typed values | errors
                        ^
                        | implements ports (internal/ports)
                        |
        PostgreSQL adapter (internal/adapters/postgres)
        pgxpool | sqlc | guarded updates | tx manager
```

Key layout: `api/proto/allocation/v1` (contract) · `gen/proto` (buf output,
committed) · `sql/{schema,queries}` + `sqlc.yaml` (typed SQL) ·
`migrations/` (goose, embedded in the binary) · `tests/integration` (real
Postgres + in-process gRPC) · `deploy/kubernetes` (reference manifests) ·
`docs/adr` (decisions).

## Technology

Go 1.27 · gRPC + Protobuf (Buf) · protovalidate · pgx/v5 + pgxpool + sqlc
(no ORM) · Goose migrations (embedded; chosen over Atlas for plain-SQL
up/down files a reviewer can read and a library mode the binary embeds —
no extra deploy artifact) · OpenTelemetry (OTLP traces) · Prometheus
metrics · log/slog JSON.

## Domain model

```text
Allocation: id (UUIDv7, app-generated), tenant_id, request_id (idempotency
key), resource_id, status, priority (0..1000), created_at/updated_at (UTC),
expires_at (optional), version (optimistic lock, starts at 1)

PENDING ──> ALLOCATED ──> RELEASED | COMPLETED
   └──────> EXPIRED | FAILED
```

Transitions live in the domain (`status.go`); invalid ones return
`ErrInvalidTransition` → gRPC `FAILED_PRECONDITION`. An allocation past its
`expires_at` cannot be allocated even before the expirer marks it.

## gRPC API (`allocation.v1`)

`CreateAllocation` (idempotent) · `GetAllocation` · `ListAllocations`
(cursor-paginated, optional status filter) · `Allocate` · `ReleaseAllocation`
· `CompleteAllocation`. No generic Update — commands carry intent.

Tenant identity comes from `x-tenant-id` request metadata (platform-
authenticated edge), never from request bodies; missing ⇒ `UNAUTHENTICATED`.
`x-request-id` / `x-correlation-id` propagate into logs.

Error model (centralized in `allocation_handler.go`): NotFound (incl.
cross-tenant — existence is never leaked), AlreadyExists, Aborted (version
conflict), FailedPrecondition (invalid transition), InvalidArgument
(protovalidate + domain validation), DeadlineExceeded/Canceled, Internal
(details logged, never exposed).

## Idempotency & concurrency

- **Create**: `UNIQUE (tenant_id, request_id)` — retries return the existing
  allocation with `replayed: true`. Race-proof at the database (ADR-007).
- **Transitions**: caller echoes `version`; `UPDATE ... WHERE version = $n`
  matching zero rows ⇒ `ABORTED` (ADR-008). Wrapped in one transaction
  (ADR-009). Verified by concurrency tests at three levels.

## Pagination

Keyset over `(created_at DESC, id DESC)`, opaque versioned tokens, default
50 / max 200, backed exactly by the composite indexes (ADR-006).

## Configuration (env)

| Variable | Default | |
|---|---|---|
| `DATABASE_URL` | — | **required**, fails fast |
| `GRPC_ADDRESS` / `HTTP_ADDRESS` | `:9096` / `:9097` | |
| `DB_MIN_CONNS` / `DB_MAX_CONNS` | 2 / 10 | pool sizing (see db.go guidance) |
| `DB_MAX_CONN_LIFETIME` / `DB_MAX_CONN_IDLE_TIME` / `DB_HEALTH_CHECK_PERIOD` | 1h / 30m / 1m | |
| `DB_QUERY_TIMEOUT` / `DB_TX_TIMEOUT` | 5s / 10s | per-query / per-transaction caps |
| `DB_MIGRATE_ON_START` | false | compose/local convenience |
| `TELEMETRY_ENABLED` / `OTLP_ADDRESS` | false / `localhost:4317` | any OTLP gRPC receiver |
| `LOG_LEVEL` / `LOG_FORMAT` | info / json | |
| `SHUTDOWN_TIMEOUT` | 20s | graceful drain window |

## Local development

```bash
# toolchain: go 1.27, buf, sqlc, goose, golangci-lint (go install ...)
make generate        # buf lint+generate, sqlc generate
make build && make lint
make test-unit       # domain + application, no infrastructure
TEST_DATABASE_URL=postgres://user:pass@localhost:5432/allocation_test?sslmode=disable \
  make test-integration   # migrates itself; skips cleanly when unset
make run             # needs DATABASE_URL
```

Migrations: `DATABASE_URL=... make migrate` (or the `migrate` subcommand of
the shipped binary — same embedded files in CI/CD and production; rollback
via `goose down` using the same files).

## Docker

```bash
docker compose up    # service + its own Postgres (host port 5433), auto-migrates
make docker-build    # multi-stage -> 43MB distroless, non-root, static
```

## Observability

- `/metrics`: `grpc_requests_total`, `grpc_request_duration_seconds`,
  `db_pool_*`, `process_*`, and business counters
  `allocation_{created,allocated,released,completed,conflict,idempotency_replay}_total`
  (+ `allocation_latency_seconds`). Low-cardinality labels only.
- Traces: gRPC server spans via otelgrpc to OTLP; one span per RPC named
  `allocation.v1.AllocationService/<Method>`.
- Logs: JSON slog with `service`, `environment`, `trace_id`, `span_id`,
  `request_id`, `correlation_id`, `tenant_id`, `operation`, `duration`,
  `grpc_code`, `error`. Payloads are never logged.
- Health: gRPC `grpc.health.v1.Health` + HTTP `/healthz` (liveness: process
  only) and `/readyz` (readiness: includes DB ping).

## Production deployment

`deploy/kubernetes/deployment.yaml` is the reference: startup/liveness/
readiness probes on the HTTP port, `terminationGracePeriodSeconds` >
`SHUTDOWN_TIMEOUT`, non-root + read-only rootfs security context, resource
requests/limits. Shutdown sequence on SIGTERM/SIGINT: mark NOT_SERVING →
drain in-flight RPCs (bounded) → stop HTTP → flush telemetry → close pool.
TLS: terminate at the mesh/ingress today; the server is credential-ready.
Database user should be least-privilege (DML on `allocations` +
`goose_db_version` only).
