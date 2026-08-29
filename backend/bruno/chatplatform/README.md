# chatplatform Bruno collection

End-to-end API tests for the platform's OAuth2-secured services. Import into
[Bruno](https://www.usebruno.com/): **Open Collection → select this folder**
(`backend/bruno/chatplatform`), then pick the **Local** environment (top-right).

## Prerequisites

The stack must be up:

```bash
bash localrun/start.sh
```

## Run order

Requests are numbered — run them top to bottom, or use *Run Folder*:

| Folder | What it proves |
|---|---|
| **01 authservice** | Token issuance (client_credentials via the dev-only `dev-cli` client), OIDC discovery, JWKS, and the admin-only user-management API. **Run request 01 first** — it stores `{{access_token}}` in the environment for everything else. Tokens expire after 15 min; just re-run it. |
| **02 chatservice** | REST tenant CRUD on port 8080 behind JWT validation (list → create → get → update → delete), plus the 401 negative case. |
| **03 chatdashboardbff** | The zero-trust chain: BFF (8100) validates your JWT, forwards it as gRPC metadata to accountservice (9095), which re-validates and enforces `account.read`/`account.write` scopes before touching the database. |
| **04 health** | Actuator health for all four services (loopback-only management ports 8111/8081/8091/8101). |

Expected "failures" that are actually correct behavior:
- Re-running a **Create** without the matching **Delete** → `409` (slug/email conflict).
- Any request after the token expires → `401` (re-run `01 authservice / 01`).

## The two gRPC services (no HTTP surface)

accountservice (9095) is fully exercised through the BFF folder above. To hit
the gRPC ports directly, use [grpcurl](https://github.com/fullstorydev/grpcurl):

```bash
# Token first (same as the Bruno request):
TOKEN=$(curl -s -u dev-cli:dev-secret -d "grant_type=client_credentials&scope=account.read account.write" \
  http://localhost:8110/oauth2/token | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

# Health stays open (no token):
grpcurl -plaintext localhost:9095 grpc.health.v1.Health/Check

# Business RPCs need the Bearer token:
grpcurl -plaintext -H "authorization: Bearer $TOKEN" \
  -d '{"page":0,"size":20}' localhost:9095 com.chatplatform.accountservice.grpc.TenantService/ListTenants

# Without the token -> UNAUTHENTICATED:
grpcurl -plaintext -d '{"page":0,"size":20}' localhost:9095 com.chatplatform.accountservice.grpc.TenantService/ListTenants
```

### allocationservice - covered natively in folder 05

allocationservice is not part of the localrun aggregate. Start it from its own
compose (its own Postgres on 5433; migrations run on start):

```bash
cd backend/microservices/allocationservice && docker compose up -d --build
```

That default runs `AUTH_MODE=trusted-header` (tenant from `x-tenant-id`
metadata). To require verified platform JWTs instead:

```bash
cd backend/microservices/allocationservice && AUTH_MODE=jwt docker compose up -d
```

**Folder 05's requests send BOTH identity headers** (`x-tenant-id` and
`authorization: Bearer {{access_token}}`), so they work unchanged in either
mode - each mode simply ignores the other header. Bruno discovers the methods
via gRPC **server reflection**, no proto files needed. The gRPC health check
and the HTTP sidecar probes (9097 `/healthz`, `/readyz`) need no identity at
all.

## Dev credentials (dev profile only — never exist in real deployments)

| What | Value |
|---|---|
| curl/CI client | `dev-cli` / `dev-secret` (client_credentials, all scopes) |
| Browser login (auth-code flow) | `admin@local` / `admin-dev-password` at http://localhost:8110/login |
