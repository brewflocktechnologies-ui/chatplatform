# chatdashboardbff E2E API tests

Black-box [Playwright API tests](https://playwright.dev/docs/api-testing)
against the real running chain: BFF REST → gRPC → accountservice → R2DBC →
the shared Postgres `tenant` table. Nothing mocked — these prove end to end
what the unit/slice tests prove in isolation: the CRUD lifecycle (including
the `version` optimistic-lock bump and slug immutability), the RFC 7807
error contracts (400 `fieldErrors` / 404 / 409), and that the served OpenAPI
document still matches the committed contract's paths.

Pure API mode — no browser is launched, so `npx playwright install` is NOT
needed. `workers: 1` on purpose: the lifecycle tests share the created
tenant's id. Each run uses a unique timestamp slug and deletes what it
created (`afterAll`), so runs never collide or leak rows.

## Run

```bash
# 1. Stack up - either host processes or containers:
bash localrun/start.sh
#    or: docker compose -f backend/microservices/docker-compose.yml up -d

# 2. From this folder:
npm install     # first time only
npm test
```

`BFF_BASE_URL` overrides the default `http://localhost:8100`. HTML report
lands in `playwright-report/` (`npx playwright show-report` to open).

Deliberately not wired into `mvn verify`: these need the full live stack,
which the Maven build must not depend on. The natural CI home is a compose-up
job step — same shape as the Pact provider IT's "needs Postgres" note in
AGENTS.md.
