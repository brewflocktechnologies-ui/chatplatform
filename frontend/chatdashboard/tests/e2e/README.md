# End-to-end tests (Playwright)

Production-grade E2E coverage for the dashboard's user workflows. Tests drive the
real app: the Next.js dev server, the standalone WebSocket hub
(`frontend/server/server.mjs`), and the MongoDB database from `.env.local`.

## Layout

```
e2e/
├── setup/
│   └── auth.setup.ts        # UI login once → storage state reused by all tests
├── support/
│   ├── env.ts               # .env.local loader for the Playwright process
│   ├── db.ts                # MongoDB seeding/cleanup (mirrors the app's data shapes)
│   ├── fixtures.ts          # test.extend: `db` seeder fixture, `wsUrl`
│   ├── visitor-client.ts    # chat-widget visitor simulator (raw WebSocket protocol)
│   └── pages/               # page objects: sign-in, shell, data tables, chat
└── tests/
    ├── auth.spec.ts             # login, validation, guard redirects, sign-out
    ├── navigation.spec.ts       # sidebar, kbar (Cmd+K), redirects, theme toggle
    ├── overview.spec.ts         # stat cards + parallel-route streaming
    ├── customers.spec.ts        # search/URL state, edit, delete, empty state
    ├── websites.spec.ts         # search, embed-code wizard, edit, delete
    ├── widget-modifier.spec.ts  # customer→website cascade + deep links
    ├── chat.spec.ts             # visitor⇄hub⇄agent realtime flows (serial)
    └── ai-chat.spec.ts          # scripted streaming demo
```

## Running

```bash
npm run e2e          # headless, starts dev server + WS hub automatically
npm run e2e:ui       # Playwright UI mode
npm run e2e:headed   # headed browser
npm run e2e:report   # open the last HTML report
```

Playwright's `webServer` config boots `npm run dev` (port 3000) and
`node ../server/server.mjs` (port 8088) if they aren't already running, and
reuses them if they are.

## Environment

- `MONGODB_URI` (from `.env.local`) — required for the customers, websites and
  widget-modifier specs. Without it those specs **skip** instead of failing.
- `NEXT_PUBLIC_CHAT_WS_URL` — optional; defaults to `ws://localhost:8088`.
- `E2E_BASE_URL` — optional override of `http://localhost:3000`.

## Data policy

Mutation tests never touch pre-existing rows. Each test seeds its own
documents (name-prefixed `E2E-PW …`) directly into the app database via
`support/db.ts`, asserts against exactly those rows, and the fixture deletes
them in teardown. A sweep also removes any prefixed rows older than an hour,
so crashed runs cannot accumulate residue.

## Known product gaps encoded in the suite

- `chat.spec.ts` runs serial because every open dashboard receives all
  `demo-tenant` traffic — the tenant id is currently hardcoded in the app.
- The widget-customization micro-frontend is an external deployable; the
  widget-modifier spec covers the dashboard-owned selection shell only.
