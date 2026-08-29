# SPEC-SEC-001 — Security, Authentication, Authorization & Multi-Tenancy

| Field | Value |
|---|---|
| Status | Draft v0.1 — for implementation |
| Owner | Platform |
| Applies to | api-gateway/BFF, auth-service, ws-gateway, conversation-service, allocation-service, presence-service, tenant-onboarding-service, chat widget, dashboard MFEs, edge (L4/L7), Postgres, NATS, Valkey |
| Related | SPEC-WS (WebSocket protocol), SPEC-ALLOC (allocation engine), SPEC-INFRA-LOCAL (Compose rig) |
| Conformance | RFC 2119 keywords (MUST / SHOULD / MAY) |

---

## 0. Goals and non-goals

**Goals**

- G1. Zero cross-tenant data exposure, enforced at three independent layers (token → application policy → database RLS).
- G2. Browser-held credentials cannot be exfiltrated by XSS in dashboard bundles (BFF + HttpOnly cookies).
- G3. Visitors cannot impersonate other visitors or named contacts (visitor JWT + HMAC identity verification).
- G4. No internal hop trusts unauthenticated input (mTLS + signed internal identity token).
- G5. Every component is open source, self-hostable on bare metal, and replaceable (no proprietary IdP, KMS, or mesh dependency).
- G6. The full security path runs unchanged in Docker Compose on a laptop, under the same config contract as production (15-factor).

**Non-goals (v1)**

- SAML / SCIM enterprise SSO (v2, hook points reserved).
- Hardware-backed keys (HSM). Software keys with rotation in v1.
- End-to-end message encryption between visitor and agent.

**Constraints**

- Language: Go for all services. Crypto only from `crypto/*`, `golang.org/x/crypto`, `github.com/go-jose/go-jose/v4`, `github.com/lestrrat-go/jwx/v3` (pick one JOSE lib per ADR-SEC-01).
- No Keycloak (existing decision). auth-service is the issuer.
- All components must run from a single `docker compose up`.

---

## 1. Terminology and principals

| Term | Definition |
|---|---|
| Tenant | A paying customer organisation. `tenant_id` is a UUIDv7. |
| Tenant user | Human with a login: `owner`, `admin`, `agent`, `viewer`. |
| Visitor | End-user of the tenant's website interacting via the widget. Anonymous unless verified. |
| Verified visitor | Visitor whose identity the tenant's backend vouched for via HMAC (§5.3). |
| Service principal | One of the seven Go services, identified by mTLS certificate SAN. |
| Principal context | Struct carried through every request: `{typ, sub, tenant_id, roles[], scope[], jti, iat, exp, verified}`. |
| Widget key | Public identifier `wk_<tenant-short>_<random>` embedded in the customer's page. Not secret. |
| Widget secret | Per-tenant HMAC secret `ws_…` shown once; used for identity verification. Secret. |
| API key | Per-tenant server-to-server key `ak_<prefix>_<random>`. Secret. |

Three token types are defined and MUST never be interchangeable (§3).

---

## 2. Requirements

Numbering: `SEC-<area>-<n>`. Each requirement has an acceptance test ID in §15.

### 2.1 Identity & tokens

- **SEC-TOK-1** Access tokens are JWS (compact), alg `EdDSA` (Ed25519). `none`, HS*, and RS* MUST be rejected by every verifier. (T-TOK-1)
- **SEC-TOK-2** Access token TTL: tenant user 10 min; visitor 24 h sliding; service/internal 2 min. (T-TOK-2)
- **SEC-TOK-3** Every token carries `typ` ∈ {`user`,`visitor`,`svc`}. Endpoints declare an allowed `typ` set; mismatch → 403. (T-TOK-3)
- **SEC-TOK-4** Refresh tokens are 32 random bytes, base64url, stored only as SHA-256. Rotated on every use. Presenting a consumed refresh token revokes the entire token family. (T-TOK-4, T-TOK-5)
- **SEC-TOK-5** Signing keys are published at `/.well-known/jwks.json` with `kid`. Verifiers cache JWKS ≤ 5 min and MUST support at least two concurrently valid keys (rotation overlap). (T-TOK-6)
- **SEC-TOK-6** Access-token revocation is by `jti` denylist in Valkey with TTL = remaining `exp`. Checked by gateway and ws-gateway only. (T-TOK-7)
- **SEC-TOK-7** Tokens MUST NOT appear in URLs, query strings, or logs. Log redaction middleware masks `Authorization`, `Cookie`, `Sec-WebSocket-Protocol`. (T-TOK-8)

### 2.2 Tenant user authentication

- **SEC-USR-1** Passwords hashed with Argon2id (m=64 MiB, t=3, p=4). Minimum length 12, checked against a breached-password bloom filter (offline HIBP list) at signup/change. (T-USR-1)
- **SEC-USR-2** Login rate limit: 10 attempts / 15 min per (email) and 50 / 15 min per IP; lockout returns identical response to wrong password (no enumeration). (T-USR-2)
- **SEC-USR-3** TOTP MFA (RFC 6238) available to all users; MUST be enforced for `owner` and `admin`. Recovery codes: 10, single-use, hashed. (T-USR-3)
- **SEC-USR-4** Social login via OIDC (Google, Microsoft) using authorization code + PKCE. `identities(provider, provider_sub)` unique. Email is never used as the link key. (T-USR-4)
- **SEC-USR-5** Sessions are visible and revocable per device from the dashboard. (T-USR-5)

### 2.3 Dashboard (BFF)

- **SEC-BFF-1** Browser holds only `__Host-sess` cookie: `HttpOnly; Secure; SameSite=Lax; Path=/`. Value is an opaque session ID mapped in Valkey to `{user_id, tenant_id, refresh_token_id, access_token(cached)}`. (T-BFF-1)
- **SEC-BFF-2** BFF exchanges session → access JWT server-side; JWT never reaches the browser. (T-BFF-1)
- **SEC-BFF-3** Mutating requests (POST/PUT/PATCH/DELETE) require `Origin` header ∈ tenant dashboard origins AND `X-Requested-With: fetch`. Absent/mismatch → 403. (T-BFF-2)
- **SEC-BFF-4** CSP for dashboard host: `default-src 'self'; script-src 'self' <mfe-remote-origins>; connect-src 'self' wss://<ws-origin>; frame-ancestors 'none'; object-src 'none'`. Nonce-based inline scripts only. (T-BFF-3)
- **SEC-BFF-5** Idle timeout 30 min; absolute timeout 12 h; both configurable per tenant. (T-BFF-4)

### 2.4 Widget & visitors

- **SEC-WGT-1** `POST /widget/v1/bootstrap` accepts `{widget_key}`; server validates `Origin` against the tenant's allowed origins (exact host match, wildcard subdomain permitted `*.example.com`). Mismatch → 403 with generic body. (T-WGT-1)
- **SEC-WGT-2** Bootstrap issues a visitor JWT (`typ=visitor`) and a `visitor_id` (UUIDv7). Rate limit: 30 / min per IP, 600 / min per widget key; excess → 429. (T-WGT-2)
- **SEC-WGT-3** Identity verification: when the page provides `{user_id, user_hash}` and `user_hash == HMAC-SHA256(widget_secret, user_id)`, the token is issued with `verified=true` and `sub=user_id` (tenant-scoped). Otherwise `verified=false`, and the token MUST NOT be linkable to any contact record with a `user_id`. (T-WGT-3, T-WGT-4)
- **SEC-WGT-4** A tenant may set `require_identity_verification=true`; then unverified bootstraps are refused. (T-WGT-5)
- **SEC-WGT-5** Adaptive bot challenge: if per-IP bootstrap rate > threshold or reputation score low, respond `{challenge_required:true}`; widget renders a self-hosted challenge (ALTCHA proof-of-work, open source). (T-WGT-6)
- **SEC-WGT-6** Widget runs inside an iframe served from the platform origin; parent page communicates via `postMessage` with origin checks both ways. No tenant secret is ever shipped to the browser. (T-WGT-7)
- **SEC-WGT-7** Visitor token is stored in `localStorage` under the platform's iframe origin (not the customer's origin). (T-WGT-7)

### 2.5 WebSocket

- **SEC-WS-1** Dashboard WS: authenticated via `__Host-sess` cookie on upgrade; ws-gateway calls BFF-internal `POST /internal/session/resolve` (mTLS) to obtain the principal. (T-WS-1)
- **SEC-WS-2** Widget WS: client calls `POST /widget/v1/ws-ticket` with visitor JWT → receives single-use ticket `wt_…` (Valkey, TTL 30 s). Upgrade request carries it as subprotocol `v1.ticket.<ticket>`; server responds selecting `v1`. Ticket deleted on first use. (T-WS-2, T-WS-3)
- **SEC-WS-3** No credential in the URL. Upgrade with `?token=` → 400. (T-WS-4)
- **SEC-WS-4** Server enforces subscriptions: visitor may only subscribe to `t.<tid>.conv.<cid>` where `cid` is bound in its token or was created by it; agents per §8 policy. Unauthorized subscribe → close 4403. (T-WS-5)
- **SEC-WS-5** Credential expiry: 60 s before `exp` server sends `{"t":"reauth"}`; client sends `{"t":"auth","token":…}`; if not renewed by `exp` → close 4401. (T-WS-6)
- **SEC-WS-6** Origin check on upgrade for both dashboard and widget paths. (T-WS-7)
- **SEC-WS-7** Max frame 64 KiB, max 30 msg/s per connection, idle ping 25 s / pong timeout 10 s. (T-WS-8)

### 2.6 Edge (L4 → L7 → gateway)

- **SEC-EDGE-1** L4 (HAProxy, `mode tcp`) forwards with PROXY protocol v2; L7 (Nginx) terminates TLS 1.2+/1.3, HTTP/2, and accepts PROXY protocol. (T-EDGE-1)
- **SEC-EDGE-2** L7 strips inbound `X-Tenant-Id`, `X-User-Id`, `X-Principal`, `X-Internal-Token`, `Forwarded`, and re-sets `X-Forwarded-For` from PROXY source. (T-EDGE-2)
- **SEC-EDGE-3** L7 rate limits: `/auth/*` 20 r/m/IP, `/widget/v1/bootstrap` per §2.4, global 600 r/m/IP with burst 100. Body limit 1 MiB (10 MiB on upload routes). (T-EDGE-3)
- **SEC-EDGE-4** Security headers on all responses: HSTS (1 year, preload in prod), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimal. (T-EDGE-4)
- **SEC-EDGE-5** L7 → gateway link uses TLS with a private CA (re-encrypt); in Compose this is the same mkcert/step CA as §12. (T-EDGE-5)

### 2.7 Gateway & internal propagation

- **SEC-GW-1** Gateway verifies external credentials exactly once, builds the Principal Context, and mints an **internal token** (`typ=svc`, `act` = calling service, `sub`/`tenant_id`/`roles` = original principal, TTL 2 min, `aud` = target service). (T-GW-1)
- **SEC-GW-2** Internal token travels in gRPC metadata `x-internal-token`. Services verify signature, `aud`, `exp`; reject if absent. HTTP between services is prohibited except health. (T-GW-2)
- **SEC-GW-3** All service-to-service gRPC uses mTLS. Server interceptor checks peer cert SAN against a static allow-list per method (e.g. `allocation.v1.Assign` ← {conversation-service}). (T-GW-3)
- **SEC-GW-4** `tenant_id` in any request body/proto field is advisory; the interceptor overwrites it from the internal token and logs a WARN on mismatch. (T-GW-4)
- **SEC-GW-5** Interceptor chain order (server): recover → mTLS-peer → internal-token → tenant-inject → authz → audit → handler. (T-GW-5)

### 2.8 Authorization

- **SEC-AZ-1** RBAC roles per tenant: `owner ⊃ admin ⊃ agent ⊃ viewer`. Permissions enumerated in §8.1; new permissions require spec change. (T-AZ-1)
- **SEC-AZ-2** Resource scope for conversations: agent may `read/write` a conversation iff assigned, or in an assigned team's queue, or role ≥ admin. Visitors may access only conversations they created. (T-AZ-2)
- **SEC-AZ-3** Single policy package `internal/authz` with `Can(ctx, action, resource) error`. No handler performs ad-hoc role checks. Lint rule forbids importing role constants outside `authz`. (T-AZ-3)
- **SEC-AZ-4** Postgres RLS enabled on every table with a `tenant_id` column, using `current_setting('app.tenant_id', true)`. App connections use role `app_rw` (no `BYPASSRLS`); migrations use `app_migrator`. Every transaction opens with `SET LOCAL app.tenant_id`. (T-AZ-4, T-AZ-5)
- **SEC-AZ-5** Cross-tenant test suite (§15.4) is a merge gate. (T-AZ-6)

### 2.9 Public API & webhooks

- **SEC-API-1** API keys: `ak_<8-char-prefix>_<32 bytes b64url>`; store `prefix` + SHA-256 + scopes + `last_used_at`; display once. Sent as `Authorization: Bearer ak_…`. (T-API-1)
- **SEC-API-2** Scopes: `conversations:read`, `conversations:write`, `contacts:read`, `contacts:write`, `webhooks:manage`. Keys are tenant-bound; principal `typ=svc`, `sub=apikey:<id>`. (T-API-2)
- **SEC-API-3** Webhooks signed: header `X-Signature: t=<unix>,v1=<hex HMAC-SHA256(secret, t + "." + body)>`; receivers reject if `|now−t| > 300 s`. Retries with exponential backoff, 24 h max. (T-API-3)
- **SEC-API-4** Webhook destinations: HTTPS only, DNS resolved and checked against RFC 1918/loopback/link-local/metadata ranges at send time (SSRF guard), redirects not followed. (T-API-4)

### 2.10 Messaging & cache

- **SEC-NATS-1** One NATS account per environment; one NATS user per service with explicit `publish.allow` / `subscribe.allow` lists (§9). Wildcard `>` is prohibited for non-admin users. (T-NATS-1)
- **SEC-NATS-2** Subject scheme: `t.<tenant_id>.conv.<conv_id>.<event>`, `t.<tenant_id>.presence.<user_id>`, `sys.<service>.<event>`. Browser never connects to NATS. (T-NATS-2)
- **SEC-NATS-3** TLS on all NATS client and route connections; JetStream streams and KV inherit subject ACLs. (T-NATS-3)
- **SEC-VK-1** Valkey ACL users per service: `auth-svc` → `sess:* jti:* wt:* rl:*`; `alloc-svc` → `alloc:*`; `presence-svc` → `presence:*`; `ws-gw` → `wt:* jti:*` read-only. Default user disabled. (T-VK-1)
- **SEC-VK-2** Valkey TLS enabled; `FLUSHALL`, `CONFIG`, `DEBUG`, `KEYS` denied for all app users. Lua scripts loaded at startup from the repo; `EVAL` with client-supplied source denied. (T-VK-2)
- **SEC-VK-3** All keys prefixed `<ns>:<tenant_id>:…` except global rate-limit keys. (T-VK-3)

### 2.11 Secrets, keys, data protection, audit

- **SEC-KEY-1** JWT signing keys rotate every 90 days with a 24 h overlap; rotation is a runtime operation (no restart). (T-KEY-1)
- **SEC-KEY-2** Secrets are injected via environment or mounted files (15-factor III), sourced from SOPS+age encrypted files in the repo for Compose, and from OpenBao/Vault or Kubernetes secrets in prod. Code reads only `secret.Get("NAME")`. (T-KEY-2)
- **SEC-DATA-1** PII columns (`contacts.email`, `contacts.phone`, `visitors.ip`) are envelope-encrypted: per-tenant DEK (AES-256-GCM) wrapped by a KEK from the secret store. Tenant deletion = DEK destruction. (T-DATA-1)
- **SEC-DATA-2** Blind indexes (HMAC-SHA256 of normalised value) for equality lookup on encrypted columns. (T-DATA-1)
- **SEC-AUD-1** Append-only `audit_events` (Postgres, `INSERT` only for `app_rw`) and mirrored to JetStream `AUDIT` stream: login success/fail, MFA change, role change, API key create/revoke, session revoke, transcript export, impersonation, tenant settings change. (T-AUD-1)
- **SEC-AUD-2** Audit rows carry `actor`, `tenant_id`, `action`, `target`, `ip`, `ua`, `request_id`, `at`. Retained ≥ 400 days. (T-AUD-1)

### 2.12 Supply chain & runtime

- **SEC-SC-1** Containers: distroless/static base, non-root UID, read-only root FS, `no-new-privileges`, dropped capabilities. (T-SC-1)
- **SEC-SC-2** `govulncheck`, `gosec`, `trivy` (images), and `gitleaks` run in CI; high/critical blocks merge. (T-SC-2)
- **SEC-SC-3** SBOM (CycloneDX) generated per image. (T-SC-2)

---

## 3. Token specifications

### 3.1 Tenant user access token (`typ=user`)

```json
{
  "iss": "https://auth.<platform-domain>",
  "aud": ["api"],
  "sub": "u_01J8…",
  "tid": "t_01J7…",
  "typ": "user",
  "rol": ["agent"],
  "tm":  ["team_01J9…"],
  "amr": ["pwd","totp"],
  "sid": "s_01JA…",
  "jti": "01JB…",
  "iat": 1756450000,
  "exp": 1756450600
}
```
Header: `{"alg":"EdDSA","kid":"2026-08-a","typ":"JWT"}`.

### 3.2 Visitor token (`typ=visitor`)

```json
{
  "iss": "https://auth.<platform-domain>",
  "aud": ["widget"],
  "sub": "v_01JC…",
  "tid": "t_01J7…",
  "typ": "visitor",
  "wk":  "wk_acme_9f3a",
  "ver": false,
  "ext": null,
  "cnv": ["c_01JD…"],
  "jti": "01JE…",
  "iat": 1756450000,
  "exp": 1756536400
}
```
`ver=true` ⇒ `ext` = tenant's external user id (HMAC-verified). `cnv` lists conversation ids the visitor may attach to; conversation-service extends it via re-issue on new conversation.

### 3.3 Internal token (`typ=svc`)

```json
{
  "iss": "https://auth.<platform-domain>",
  "aud": ["conversation-service"],
  "act": "api-gateway",
  "sub": "u_01J8…",
  "tid": "t_01J7…",
  "typ": "svc",
  "ptyp": "user",
  "rol": ["agent"],
  "tm":  ["team_01J9…"],
  "ver": null,
  "rid": "req_01JF…",
  "jti": "01JG…",
  "iat": 1756450000,
  "exp": 1756450120
}
```
`ptyp` = type of the original external principal. For API-key callers: `sub="ak_<id>"`, `ptyp="apikey"`, `scp=[…]`.

### 3.4 Verification rules (all verifiers)

1. Parse header; `alg` MUST equal `EdDSA`; `kid` MUST resolve in cached JWKS.
2. Verify signature; check `iss`, `aud` (contains own audience), `exp` (leeway 30 s), `nbf` if present.
3. Check `typ` against endpoint policy.
4. For `typ ∈ {user, svc}` at gateway/ws-gateway: check `jti` ∉ Valkey `jti:deny`.
5. Populate Principal Context; never read `tid` from anywhere else afterwards.

---

## 4. auth-service API contract (OpenAPI summary)

Base path `/auth/v1`. All responses `application/problem+json` on error (RFC 9457). Generic messages; no account enumeration.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/login` | none | email+password → `{mfa_required}` or session cookie (via BFF) |
| POST | `/mfa/verify` | pre-auth cookie | TOTP or recovery code |
| POST | `/logout` | session | revoke session + refresh family |
| POST | `/token` | internal (BFF) | session_id → access JWT (cached until 60 s before exp) |
| POST | `/token/refresh` | internal (BFF) | rotate refresh; reuse → revoke family, 401 |
| GET | `/.well-known/jwks.json` | none | current + previous keys |
| GET | `/.well-known/openid-configuration` | none | discovery (issuer, jwks_uri, algs) |
| GET | `/oidc/{provider}/start` | none | PKCE authorization redirect |
| GET | `/oidc/{provider}/callback` | none | code exchange, identity link |
| GET | `/sessions` | session | list devices |
| DELETE | `/sessions/{sid}` | session | revoke device |
| POST | `/mfa/totp/enroll` `/confirm` `/disable` | session + recent-auth | TOTP lifecycle |
| POST | `/password/reset/request` `/confirm` | none | single-use token, 30 min, hashed at rest |
| POST | `/internal/session/resolve` | mTLS (ws-gateway) | session cookie → principal |
| POST | `/internal/visitor/issue` | mTLS (gateway) | bootstrap → visitor JWT |
| POST | `/internal/svc-token` | mTLS (gateway, ws-gateway) | mint internal token |
| POST | `/internal/keys/rotate` | mTLS (ops CLI) | add new signing key |

**Data model (Postgres, all under RLS except `signing_keys`)**

```
tenants(id, slug, plan, settings jsonb, created_at)
users(id, tenant_id, email_bidx, email_enc, name, role, status, mfa_enabled, created_at)
credentials(user_id PK, argon2id_hash, updated_at)
mfa_totp(user_id PK, secret_enc, confirmed_at)
mfa_recovery(id, user_id, code_hash, used_at)
identities(id, user_id, provider, provider_sub, UNIQUE(provider, provider_sub))
sessions(id, tenant_id, user_id, family_id, ua, ip_enc, created_at, last_seen_at, revoked_at)
refresh_tokens(id, session_id, family_id, token_hash UNIQUE, parent_id, used_at, expires_at, revoked_at)
signing_keys(kid PK, alg, public_jwk jsonb, private_enc bytea, active_from, retire_at)
widget_keys(id, tenant_id, key UNIQUE, secret_hash, allowed_origins text[], require_verification bool, revoked_at)
api_keys(id, tenant_id, prefix, key_hash UNIQUE, scopes text[], last_used_at, revoked_at)
visitors(id, tenant_id, external_id, verified, first_seen_at, last_seen_at, ip_enc)
audit_events(id, tenant_id, actor, action, target, ip, ua, request_id, at)
```

---

## 5. Widget flows

### 5.1 Bootstrap

```
Page ──script tag──▶ widget loader (platform origin) ──iframe──▶ widget app
widget app ──POST /widget/v1/bootstrap {widget_key, user_id?, user_hash?}──▶ gateway
gateway: Origin ∈ widget_keys.allowed_origins ? → auth-service /internal/visitor/issue
       : 403
◀── {visitor_token, visitor_id, ws_url, challenge_required:false}
```

### 5.2 WS attach

```
widget ──POST /widget/v1/ws-ticket  (Bearer visitor_token)──▶ gateway
gateway: SETEX wt:<ticket> 30 <principal-json> NX
◀── {ticket}
widget ──GET wss://…/ws  Sec-WebSocket-Protocol: v1, v1.ticket.<ticket>──▶ ws-gateway
ws-gateway: GETDEL wt:<ticket> → principal; 101 with Sec-WebSocket-Protocol: v1
```

### 5.3 Identity verification (customer backend)

```js
// tenant's server, never in the browser
const hash = crypto.createHmac('sha256', WIDGET_SECRET).update(user.id).digest('hex');
// page
window.PlatformChat('identify', { user_id: user.id, user_hash: hash, name, email });
```
Server recomputes with constant-time compare. Wrong hash → bootstrap succeeds **unverified** (log WARN) unless `require_verification`.

---

## 6. WebSocket message envelope (auth-relevant subset)

```json
{"t":"auth","token":"<jwt>"}                      // client → server, re-auth
{"t":"reauth","in":60}                            // server → client
{"t":"sub","subject":"t.<tid>.conv.<cid>"}        // client → server
{"t":"err","code":4403,"msg":"forbidden"}         // server → client
```
Close codes: 4400 bad request, 4401 unauthenticated / expired, 4403 forbidden, 4408 auth timeout, 4429 rate limited.

---

## 7. Edge configuration (reference)

**HAProxy (L4)**
```
frontend fe_tcp
  bind *:443
  mode tcp
  default_backend be_l7
backend be_l7
  mode tcp
  balance roundrobin
  server nginx1 nginx:8443 send-proxy-v2 check
```

**Nginx (L7) excerpts**
```
listen 8443 ssl http2 proxy_protocol;
set_real_ip_from 10.0.0.0/8; real_ip_header proxy_protocol;
ssl_protocols TLSv1.2 TLSv1.3;
proxy_set_header X-Tenant-Id "";  proxy_set_header X-User-Id "";
proxy_set_header X-Internal-Token ""; proxy_set_header Forwarded "";
proxy_set_header X-Forwarded-For $proxy_protocol_addr;
limit_req_zone $binary_remote_addr zone=auth:10m rate=20r/m;
location /auth/ { limit_req zone=auth burst=5 nodelay; proxy_pass https://gateway; }
location /ws    { proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade;
                  proxy_set_header Connection "upgrade"; proxy_read_timeout 90s;
                  proxy_pass https://wsgateway; }
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

---

## 8. Authorization model

### 8.1 Permission matrix

| Permission | owner | admin | agent | viewer |
|---|---|---|---|---|
| tenant.settings.write | ✓ | ✓ | | |
| tenant.billing.manage | ✓ | | | |
| users.invite / role.change | ✓ | ✓ | | |
| apikeys.manage / widgetkeys.manage | ✓ | ✓ | | |
| conversations.read.all | ✓ | ✓ | | ✓ |
| conversations.read.assigned | ✓ | ✓ | ✓ | |
| conversations.write.assigned | ✓ | ✓ | ✓ | |
| conversations.takeover | ✓ | ✓ | | |
| conversations.export | ✓ | ✓ | | |
| contacts.read / write | ✓ | ✓ | ✓ / ✓ | ✓ / |
| audit.read | ✓ | ✓ | | |

### 8.2 Policy package sketch (Go)

```go
package authz

type Action string
type Resource struct{ Kind string; TenantID, ID, OwnerID string; AssignedTo, Teams []string }

func Can(p principal.Context, a Action, r Resource) error {
    if p.TenantID != r.TenantID { return ErrForbidden }          // hard wall
    switch p.Typ {
    case principal.Visitor:  return visitorPolicy(p, a, r)
    case principal.User:     return userPolicy(p, a, r)
    case principal.Svc:      return svcPolicy(p, a, r)           // api keys → scopes
    }
    return ErrForbidden
}
```
Table-driven tests enumerate every (role, action, resource-relationship) cell.

### 8.3 Row-level security (SQL)

```sql
-- roles
CREATE ROLE app_migrator LOGIN;                 -- owns schema
CREATE ROLE app_rw LOGIN NOBYPASSRLS;           -- application
GRANT USAGE ON SCHEMA public TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rw;
REVOKE UPDATE, DELETE ON audit_events FROM app_rw;

-- helper
CREATE OR REPLACE FUNCTION app_tenant() RETURNS uuid
  LANGUAGE sql STABLE AS $$ SELECT current_setting('app.tenant_id', true)::uuid $$;

-- per table (repeat via migration generator)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON conversations
  USING (tenant_id = app_tenant())
  WITH CHECK (tenant_id = app_tenant());

-- partitioned messages: policy on parent propagates to partitions
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON messages
  USING (tenant_id = app_tenant()) WITH CHECK (tenant_id = app_tenant());
```

Go side (pgx):
```go
tx, _ := pool.Begin(ctx)
_, _ = tx.Exec(ctx, "SELECT set_config('app.tenant_id', $1, true)", p.TenantID)
```
A `pgxpool` `BeforeAcquire` hook asserts `app.tenant_id` is unset (connection reuse safety); CI fails if any query runs outside a tenant-scoped transaction (wrapper type `TenantTx` is the only way to get a querier).

---

## 9. NATS and Valkey configuration

**nats-server.conf (per-service users)**
```
accounts {
  APP {
    jetstream: enabled
    users: [
      { user: ws-gateway, password: $WS_GW_NATS_PW,
        permissions: { publish: ["t.*.conv.*.client.>", "sys.ws-gateway.>"],
                       subscribe: ["t.*.conv.*.server.>", "t.*.presence.>", "_INBOX.>"] } },
      { user: conversation-service, password: $CONV_NATS_PW,
        permissions: { publish: ["t.*.conv.*.server.>", "sys.conversation.>"],
                       subscribe: ["t.*.conv.*.client.>", "_INBOX.>"] } },
      { user: allocation-service, password: $ALLOC_NATS_PW,
        permissions: { publish: ["sys.allocation.>"], subscribe: ["sys.conversation.created", "_INBOX.>"] } },
      { user: presence-service, ... },
      { user: auditor, permissions: { subscribe: ["audit.>"], publish: [] } }
    ]
  }
  SYS { users: [ { user: sys, password: $SYS_PW } ] }
}
system_account: SYS
tls { cert_file: /certs/nats.crt, key_file: /certs/nats.key, ca_file: /certs/ca.crt, verify: true }
```
Passwords are placeholders for Compose; prod uses NKeys or client certs (same ACL shape).

**Valkey ACL file**
```
user default off
user auth-svc on >$AUTH_VK_PW ~sess:* ~jti:* ~wt:* ~rl:* +@read +@write +@scripting -@dangerous
user alloc-svc on >$ALLOC_VK_PW ~alloc:* +@read +@write +@scripting -@dangerous
user presence-svc on >$PRES_VK_PW ~presence:* +@read +@write -@dangerous
user ws-gw on >$WSGW_VK_PW ~wt:* ~jti:* +get +getdel +exists -@all
```

---

## 10. Key management and rotation

- Signing key material stored in `signing_keys.private_enc`, encrypted with the KEK from the secret store; loaded into memory at boot; new keys via `/internal/keys/rotate`.
- Rotation procedure: (1) insert key B `active_from=now+1h`; (2) JWKS now serves A+B; (3) after 1 h issuance switches to B; (4) after 24 h A `retire_at` set, removed from JWKS at `retire_at + 5 min`.
- KEK: Compose → `age` key in SOPS; prod → OpenBao transit (open source, Vault-compatible) or cloud KMS behind the same `kms.Wrapper` interface (no lock-in).
- Widget secret and API key secrets: shown once; rotation creates a new key with 7-day overlap.

---

## 11. 15-factor mapping for the security path

| Factor | How this spec satisfies it |
|---|---|
| I Codebase / II Dependencies | One monorepo; Go modules vendored, SBOM per image |
| III Config | All secrets and endpoints from env / mounted files; `config.Load()` fails fast on missing vars; identical var names in Compose and prod |
| IV Backing services | Postgres, NATS, Valkey, OpenBao are attached resources via URLs; swap by config only |
| V Build/Release/Run | Image built once; SOPS secrets decrypted at release; run stage reads env |
| VI Processes | Stateless services; session state in Valkey/Postgres; WS state recoverable via NATS KV |
| VII Port binding | Each service binds its own TLS port; no shared app server |
| VIII Concurrency | Horizontal scale; no sticky sessions required (ticket + KV registry) |
| IX Disposability | Graceful shutdown drains WS with close 1012; refresh rotation tolerates in-flight duplicates via `parent_id` |
| X Dev/prod parity | Same TLS, same ACLs, same RLS, same L4/L7 chain locally |
| XI Logs | Structured JSON to stdout; redaction middleware; audit to Postgres + JetStream |
| XII Admin processes | Key rotation, migrations, seed as one-off `task` commands in the same image |
| XIII API first | OpenAPI (external) and buf/protobuf (internal) are the source of truth; auth annotations live in the contracts |
| XIV Telemetry | OpenTelemetry traces carry `tenant_id` + `request_id`; auth failures are metrics, not just logs |
| XV Authn/Authz | This spec |

---

## 12. Local Docker Compose rig (SPEC-INFRA-LOCAL alignment)

**Services**: `haproxy`, `nginx`, `api-gateway`, `auth-service`, `ws-gateway`, `conversation-service`, `allocation-service`, `presence-service`, `tenant-onboarding-service`, `postgres`, `nats` (3-node cluster, JetStream), `valkey`, `openbao` (dev mode, transit enabled), `step-ca` **or** `mkcert` init container, `mailpit` (email), `otel-collector` + `jaeger`, `prism` (mocks), `k6` (load/security tests, profile `test`).

**Certificates**: `make certs` runs an init container using `smallstep/step-cli` to create a local CA and issue per-service certs with SANs `<service>`, `<service>.internal`; mounted read-only at `/certs`. Browser trust via `mkcert -install` on the host for `*.localhost` (dashboard `app.localhost`, widget `widget.localhost`, customer test sites `clientgoogle.localhost`, `clientpaypal.localhost` — real cross-origin, so Origin checks are exercised).

**Secrets**: `secrets/*.enc.env` (SOPS + age). `make dev` decrypts to `.env.local` (git-ignored). Each service gets only its own vars via `env_file`. OpenBao dev instance stores the KEK; services call transit for DEK wrap/unwrap exactly as in prod.

**Hardening in Compose** (parity with SEC-SC-1):
```yaml
x-hardened: &hardened
  read_only: true
  security_opt: ["no-new-privileges:true"]
  cap_drop: ["ALL"]
  user: "10001:10001"
  tmpfs: ["/tmp"]
```

**Profiles**: `core` (everything above), `test` (k6, playwright), `chaos` (toxiproxy between gateway↔services and ws-gateway↔NATS to test reauth/reconnect under latency).

---

## 13. Observability of security events

Metrics (Prometheus names): `auth_login_total{result}`, `auth_refresh_reuse_total`, `token_verify_fail_total{reason}`, `ws_close_total{code}`, `rls_violation_total` (from `WARN` on tenant mismatch), `nats_perm_violation_total`, `ratelimit_hit_total{zone}`. Alerts: refresh-reuse > 0 in 5 min (token theft), rls_violation > 0 (bug), verify_fail spike (attack or key rotation error).

---

## 14. ADRs to record

| ID | Decision |
|---|---|
| ADR-SEC-01 | JOSE library (`lestrrat-go/jwx/v3`) and Ed25519 for all JWTs |
| ADR-SEC-02 | BFF session cookie pattern over browser-held tokens |
| ADR-SEC-03 | Single-use Valkey ticket for widget WebSocket auth |
| ADR-SEC-04 | Signed internal token over trusted headers for service identity propagation |
| ADR-SEC-05 | Postgres RLS as second enforcement layer with `SET LOCAL` per transaction |
| ADR-SEC-06 | NATS per-service users with subject ACLs; no browser-facing NATS |
| ADR-SEC-07 | OpenBao transit + `kms.Wrapper` abstraction for envelope encryption |
| ADR-SEC-08 | ALTCHA self-hosted proof-of-work instead of third-party CAPTCHA |
| ADR-SEC-09 | step-ca/mkcert local CA to keep TLS + mTLS identical locally |
| ADR-SEC-10 | Intercom-style HMAC identity verification for visitors |

---

## 15. Acceptance tests and phase gates

### 15.1 Phase plan (each phase ends with its gate green)

| Phase | Scope | Gate command |
|---|---|---|
| P1 | auth-service: keys, JWKS, login, refresh rotation, sessions, BFF cookie | `task test:sec:p1` |
| P2 | Widget bootstrap, origin check, visitor JWT, identity verification, WS ticket | `task test:sec:p2` |
| P3 | Edge chain (HAProxy→Nginx→gateway), header stripping, rate limits, security headers | `task test:sec:p3` |
| P4 | Internal token, mTLS, gRPC interceptors, tenant injection | `task test:sec:p4` |
| P5 | authz package + RLS + cross-tenant suite | `task test:sec:p5` |
| P6 | NATS/Valkey ACLs, envelope encryption, audit, API keys, webhooks | `task test:sec:p6` |
| P7 | Chaos (reauth under latency), load (k6 100 chats), supply-chain scans | `task test:sec:p7` |

### 15.2 Test catalogue (IDs referenced by §2)

- **T-TOK-1** token with `alg=none`/`HS256`/RS256 rejected by gateway, ws-gateway, and every gRPC interceptor.
- **T-TOK-2** issued TTLs match spec; expired token → 401 / close 4401.
- **T-TOK-3** visitor token on `/api/v1/conversations` (user-only) → 403; user token on `/widget/v1/*` → 403.
- **T-TOK-4** refresh yields new pair; old refresh reused → 401 and all sessions in family revoked; metric increments.
- **T-TOK-5** concurrent double refresh within 5 s (network retry) tolerated via `parent_id` grace.
- **T-TOK-6** rotate keys; tokens signed by old `kid` valid until retire; verifiers pick up new key without restart.
- **T-TOK-7** revoked `jti` → 401 within 1 s across two gateway replicas.
- **T-TOK-8** grep of all container logs after test run contains no JWT pattern `eyJ`.
- **T-USR-1..5** password policy, enumeration-safe responses, MFA enforcement for admin, OIDC link uniqueness, device revoke.
- **T-BFF-1** browser storage and response bodies never contain JWT; cookie flags asserted by Playwright.
- **T-BFF-2** POST with foreign `Origin` → 403; missing `X-Requested-With` → 403.
- **T-BFF-3** CSP header present; injected inline script blocked (Playwright console error).
- **T-BFF-4** idle/absolute timeouts.
- **T-WGT-1** bootstrap from `clientgoogle.localhost` with a widget key whose allowed origin is `clientpaypal.localhost` → 403.
- **T-WGT-2** 31st bootstrap in a minute from one IP → 429.
- **T-WGT-3** correct HMAC → `ver=true`, `ext` set; **T-WGT-4** wrong HMAC → `ver=false`, contact not linked.
- **T-WGT-5** `require_verification` tenant refuses unverified bootstrap.
- **T-WGT-6** challenge issued above threshold; solved PoW → token.
- **T-WGT-7** widget storage lives on platform origin; `postMessage` from wrong origin ignored.
- **T-WS-1** dashboard WS without cookie → 401 on upgrade.
- **T-WS-2** ticket used twice → second upgrade 4401. **T-WS-3** ticket after 31 s → 4401.
- **T-WS-4** `?token=` in URL → 400.
- **T-WS-5** visitor subscribes to another conversation → 4403; agent subscribes to unassigned conv (role agent) → 4403; admin → ok.
- **T-WS-6** reauth sequence: token renewed in-band, connection persists; no renewal → 4401 at exp.
- **T-WS-7** bad Origin on upgrade → 403. **T-WS-8** frame > 64 KiB → 4400; > 30 msg/s → 4429.
- **T-EDGE-1** client IP visible in gateway logs equals test client IP (PROXY protocol working).
- **T-EDGE-2** request with `X-Tenant-Id: other` reaches service with header absent.
- **T-EDGE-3** 21 requests/min to `/auth/login` → 429.
- **T-EDGE-4** all security headers present on `/`, `/api/v1/*`, `/widget/v1/*`.
- **T-EDGE-5** plaintext HTTP from Nginx to gateway refused.
- **T-GW-1..5** internal token minted with correct `aud`/`act`; service call without token → `UNAUTHENTICATED`; wrong peer SAN → `PERMISSION_DENIED`; body `tenant_id` mismatch overwritten and WARN logged; interceptor order asserted by test hook.
- **T-AZ-1..3** permission matrix table test; resource-scope test; lint rule test.
- **T-AZ-4** `SELECT` with `app.tenant_id` unset returns 0 rows (not all rows) for every RLS table.
- **T-AZ-5** connection reuse: after a tenant-A transaction, a fresh transaction without `SET LOCAL` sees 0 rows.
- **T-AZ-6 cross-tenant suite**: for every REST endpoint and gRPC method, tenant B principal requests tenant A resource IDs → 403/404 and zero rows touched (verified via `pg_stat_statements` delta and audit).
- **T-API-1..4** key hashing, scope enforcement, signature verification with skew, SSRF blocks for `127.0.0.1`, `10.0.0.0/8`, `169.254.169.254`, DNS-rebind case.
- **T-NATS-1..3** ws-gateway publishing to `t.*.conv.*.server.>` → permissions violation; browser port 4222 unreachable; TLS-only.
- **T-VK-1..3** `alloc-svc` reading `sess:*` → NOPERM; `EVAL` denied; `KEYS` denied.
- **T-KEY-1..2** rotation runbook executes in Compose without restart; service fails to start with a missing secret.
- **T-DATA-1** DB dump contains no plaintext email; blind-index lookup returns the row; DEK destroy makes rows undecryptable.
- **T-AUD-1** each listed action produces exactly one audit row and one JetStream message; `UPDATE audit_events` as `app_rw` fails.
- **T-SC-1..2** containers run non-root/read-only (checked via `docker inspect`); scanners wired in CI.

### 15.3 Definition of done for SPEC-SEC-001

All P1–P7 gates green in Compose; threat model reviewed against §2; ADR-SEC-01..10 merged; runbooks for key rotation, secret rotation, session mass-revoke, and tenant deletion present in `docs/runbooks/`.

---

## 16. Open questions

1. Visitor token TTL 24 h vs. tenant-configurable (GDPR retention interplay).
2. Whether to promote the internal token to a full SPIFFE SVID model once Kubernetes is introduced (ADR later; interface already isolates it).
3. Per-tenant signing keys (stronger isolation, more ops) — deferred; `tid` claim + RLS considered sufficient for v1.
4. Passkeys/WebAuthn for agents in v1.x (open-source libs exist; adds a `credentials_webauthn` table).
