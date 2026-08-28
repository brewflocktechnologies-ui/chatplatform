# localrun

One-command start/stop for the whole local platform — Postgres, SonarQube,
the observability stack, and all three microservices, as one Docker Compose
project (`localrun/docker-compose.yml`, project name `chatplatform`):

```bash
bash localrun/start.sh   # everything up (builds changed service images), idempotent
bash localrun/stop.sh    # everything down (containers stopped, not removed - data stays)
```

(allocationservice, the Go service, runs separately with its own compose —
see "Start and verify allocationservice" below.)

Only Docker Desktop is required — no local JDK, the service images build
their own. `start.sh` waits for all six healthchecks and prints a URL
summary; service logs: `docker compose -f localrun/docker-compose.yml logs -f <service>`.

The compose file duplicates nothing: it `include`s the standalone infra
files (`infrastructure/`, `code-quality/`, `observability/` — which still
work on their own, sharing the same named volumes) and `extends` the app
services from `backend/microservices/docker-compose.yml`, overriding only
the in-network wiring (postgres/otel-lgtm by service name) and adding
`depends_on` ordering (apps wait for a healthy Postgres; BFF waits for
accountservice). `start.sh` auto-adopts infra containers that were last
created by their standalone compose projects (graceful stop + rm; data
lives in the shared named volumes, verified intact across adoption).

To run a service as a host JVM instead (debugging): stop its container
(`docker compose -f localrun/docker-compose.yml stop chatservice`) and use
`./mvnw.cmd spring-boot:run` from the service directory — same ports.
`start.sh` refuses to start while a host JVM holds a service port;
`stop.sh` kills such leftovers.

## Verify chatservice's API

```bash
# Health first
curl http://localhost:8081/actuator/health
# {"status":"UP"}

# Create
curl -X POST http://localhost:8080/api/v1/tenants \
  -H "Content-Type: application/json" \
  -d '{"slug":"verify-me","name":"Verify Me"}'
# 201, body includes tenantId, version:0, createdBy/updatedBy:"system"

# Read it back (swap in the tenantId from above)
curl http://localhost:8080/api/v1/tenants/<tenantId>

# List (paginated)
curl http://localhost:8080/api/v1/tenants

# Update (version should bump to 1)
curl -X PUT http://localhost:8080/api/v1/tenants/<tenantId> \
  -H "Content-Type: application/json" \
  -d '{"name":"Renamed","status":"SUSPENDED"}'

# Delete
curl -X DELETE http://localhost:8080/api/v1/tenants/<tenantId>
# 204
```

Or skip curl entirely: open http://localhost:8080/swagger-ui.html and drive
the same five endpoints from the browser — it's the same `TenantController`,
documented from the live app (`backend/microservices/chatservice/contract/openapi.yaml`
is a snapshot of this).

`http://localhost:8080/bootui` is the dev console (health/metrics/memory/SQL
trace/etc.) if you want a UI over the running JVM without leaving the app.

To verify the API against its Pact contract instead of ad-hoc curl (needs
Postgres up, not the running `spring-boot:run` instance — it boots its own):

```bash
cd backend/microservices/chatservice
./mvnw.cmd verify -Dtest=TenantPactConsumerTest -Dit.test=TenantPactProviderVerificationIT
```

`Tests run: 5, Failures: 0` on both — one line per CRUD interaction, printed
as it verifies. See AGENTS.md's "Contract testing (Pact)" section for how it
works.

## Verify accountservice's gRPC API

Needs `grpcurl` (not installed natively — pulled as a Docker image). On
Windows Docker Desktop `--network host` doesn't reach the host machine; use
`host.docker.internal:9095` instead of `localhost:9095`.

```bash
alias grpcurl='docker run --rm fullstorydev/grpcurl'

# Health first
grpcurl -plaintext host.docker.internal:9095 grpc.health.v1.Health/Check
# {"status": "SERVING"}

# Discover the service via reflection (no local .proto needed)
grpcurl -plaintext host.docker.internal:9095 list
grpcurl -plaintext host.docker.internal:9095 describe chatplatform.accountservice.v1.TenantService

# Create
grpcurl -plaintext -d '{"slug":"verify-me","name":"Verify Me"}' \
  host.docker.internal:9095 chatplatform.accountservice.v1.TenantService/CreateTenant
# body includes tenantId, version:0, createdBy/updatedBy:"system"

# Read it back (swap in the tenantId from above)
grpcurl -plaintext -d '{"tenant_id":"<tenantId>"}' \
  host.docker.internal:9095 chatplatform.accountservice.v1.TenantService/GetTenant

# List (same tenant table chatservice uses - rows created via either service show up here)
grpcurl -plaintext -d '{"page":0,"size":20}' \
  host.docker.internal:9095 chatplatform.accountservice.v1.TenantService/ListTenants

# Update (version should bump to 1)
grpcurl -plaintext -d '{"tenant_id":"<tenantId>","name":"Renamed","status":"TENANT_STATUS_SUSPENDED"}' \
  host.docker.internal:9095 chatplatform.accountservice.v1.TenantService/UpdateTenant

# Delete
grpcurl -plaintext -d '{"tenant_id":"<tenantId>"}' \
  host.docker.internal:9095 chatplatform.accountservice.v1.TenantService/DeleteTenant
```

`http://localhost:8090/bootui` is accountservice's dev console (same
BootUI, reactive variant); `http://localhost:8091/actuator/health` is its
actuator, loopback-only like chatservice's. See `AGENTS.md`'s "Tenant gRPC
API (accountservice)" section for the shared-table architecture and the
error-code mapping (`NOT_FOUND`/`ALREADY_EXISTS`/`INVALID_ARGUMENT`).

## Verify chatdashboardbff's REST API

The BFF exposes the same REST contract as chatservice (paths, DTO shapes,
status codes) but serves it from accountservice's gRPC API — so the curl
commands are identical to chatservice's, just on port **8100**, and they need
accountservice up on :9095 (an upstream that's down maps to `503`):

```bash
# Health first
curl http://localhost:8101/actuator/health
# {"status":"UP"}

# Create (goes REST -> gRPC -> R2DBC -> the same shared tenant table)
curl -X POST http://localhost:8100/api/v1/tenants \
  -H "Content-Type: application/json" \
  -d '{"slug":"bff-verify","name":"BFF Verify"}'
# 201, body includes tenantId, version:0, createdBy/updatedBy:"system"

# Read / list / update / delete - same shapes as chatservice's section above
curl http://localhost:8100/api/v1/tenants/<tenantId>
curl http://localhost:8100/api/v1/tenants
curl -X PUT http://localhost:8100/api/v1/tenants/<tenantId> \
  -H "Content-Type: application/json" \
  -d '{"name":"Renamed","status":"SUSPENDED"}'
curl -X DELETE http://localhost:8100/api/v1/tenants/<tenantId>   # 204
```

Errors are RFC 7807 `application/problem+json`, translated from gRPC Status
codes: 404 (NOT_FOUND), 409 (ALREADY_EXISTS), 400 (INVALID_ARGUMENT or bean
validation with `fieldErrors`), 503 (UNAVAILABLE - accountservice down), 504
(DEADLINE_EXCEEDED). All verified live, including the 503 path (killed
accountservice, watched the mapping).

Swagger UI: http://localhost:8100/swagger-ui.html — BootUI:
http://localhost:8100/bootui. Contract snapshot:
`backend/microservices/chatdashboardbff/contract/openapi.yaml`.

## Start and verify allocationservice (Go, gRPC)

allocationservice is deliberately NOT part of the aggregate compose above —
it ships its own self-contained `docker-compose.yml` with its own Postgres
(host port 5433), so it starts/stops independently:

```bash
cd backend/microservices/allocationservice && docker compose up -d --build
```

Readiness (includes a DB ping; liveness is `/healthz`):

```bash
curl -s -w "\n%{http_code}\n" http://localhost:9097/readyz
```

Every RPC needs the tenant header (`x-tenant-id`); reflection is on, so
grpcurl needs no proto files. Same Windows Docker Desktop note as
accountservice: use `host.docker.internal`, not `localhost`.

```bash
# Health
docker run --rm fullstorydev/grpcurl -plaintext host.docker.internal:9096 grpc.health.v1.Health/Check
# {"status": "SERVING"}

# Create (note the returned id and version)
docker run --rm fullstorydev/grpcurl -plaintext -H x-tenant-id:tenant-a \
  -d '{"request_id":"demo-1","resource_id":"gpu-42","priority":7}' \
  host.docker.internal:9096 allocation.v1.AllocationService/CreateAllocation

# Idempotency: run the exact same create again -> same allocation, "replayed": true

# Lifecycle (swap in <ID>; version must match what you last saw)
docker run --rm fullstorydev/grpcurl -plaintext -H x-tenant-id:tenant-a \
  -d '{"allocation_id":"<ID>","version":1}' \
  host.docker.internal:9096 allocation.v1.AllocationService/Allocate
docker run --rm fullstorydev/grpcurl -plaintext -H x-tenant-id:tenant-a \
  -d '{"allocation_id":"<ID>","version":2}' \
  host.docker.internal:9096 allocation.v1.AllocationService/CompleteAllocation

# List (cursor pagination: pass next_page_token back as page_token)
docker run --rm fullstorydev/grpcurl -plaintext -H x-tenant-id:tenant-a \
  -d '{"page_size":2}' \
  host.docker.internal:9096 allocation.v1.AllocationService/ListAllocations
```

Error semantics worth trying: repeat Allocate with a used version →
`ABORTED` (optimistic concurrency); Complete a PENDING allocation →
`FAILED_PRECONDITION`; omit the tenant header → `UNAUTHENTICATED`; another
tenant's id → `NOT_FOUND` (isolation); a malformed uuid →
`INVALID_ARGUMENT`.

Business metrics move as you make calls:

```bash
curl -s http://localhost:9097/metrics | grep ^allocation_
```

Stop (data survives in its named volume):

```bash
cd backend/microservices/allocationservice && docker compose down
```

Full detail (architecture, config, tests, ADRs):
`backend/microservices/allocationservice/README.md`.

## Verify the observability dashboard

1. Generate some traffic first (the curl block above is enough — traces and
   metrics need *a request* to show anything).
2. Open http://localhost:3000 (Grafana, login `admin`/`admin` on first run —
   change it, don't leave it default).
3. **Traces** — left nav → Explore → pick the **Tempo** datasource → TraceQL
   query `{resource.service.name="chatservice"}` → Run query. You should see
   spans like `http post /api/v1/tenants` with real durations. Swap in
   `accountservice` for its gRPC spans (e.g.
   `chatplatform.accountservice.v1.TenantService/DeleteTenant`).
4. **Metrics** — Explore → **Prometheus** datasource → query
   `http_server_requests_milliseconds_count{service_name="chatservice"}` for
   per-endpoint request counts, or `jvm_memory_used_bytes{service_name="chatservice"}`
   for JVM metrics (`service_name="accountservice"` for the other service).
   The bundled **JVM Metrics** and **RED Metrics** dashboards
   (Dashboards → Browse) chart these without hand-writing a query.
5. **Logs** — Explore → **Loki** datasource → query `{service_name="chatservice"}`
   (or `{service_name="accountservice"}`). Each line carries
   `code_filepath`/`code_function`/`code_lineno` and `severity_text` as
   labels — click a line to see them.

Metrics push on a 60-second interval — if a fresh metric doesn't show up
immediately, that's why, not a broken pipeline.

## Verify the SonarQube dashboard

1. Open http://localhost:9000 (login `admin`, password is whatever it was
   last changed to — see AGENTS.md's SonarQube section if you don't know it).
2. Projects → **chatplatform-chatservice** (or **chatplatform-accountservice**).
   The overview shows bugs, vulnerabilities, code smells, coverage %, and
   duplication at a glance — should currently read 0 bugs / 0 vulnerabilities.
3. To refresh it with the latest code, from `backend/microservices/chatservice`
   (or `backend/microservices/accountservice`):
   ```bash
   ./mvnw.cmd clean verify sonar:sonar -Dsonar.token=$SONAR_TOKEN
   ```
   (needs a project analysis token — generate one in the UI under the
   project's Administration → Analysis Tokens if you don't have one, or see
   AGENTS.md for the API equivalent.) Re-open the project page after it
   finishes; the dashboard updates with the new analysis.
