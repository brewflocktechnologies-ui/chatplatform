# End-to-end tests (Playwright)

Production-grade E2E coverage for the dashboard's user workflows. Tests drive the
real app: the Next.js dev server, Centrifugo
(`localrun/centrifugo/config.json`), and the MongoDB database from `.env.local`.

## Layout

```
e2e/
├── setup/
│   └── auth.setup.ts        # UI login once → storage state reused by all tests
├── support/
│   ├── env.ts               # .env.local loader for the Playwright process
│   ├── db.ts                # MongoDB seeding/cleanup (mirrors the app's data shapes)
│   ├── fixtures.ts          # test.extend: `db` seeder fixture, `wsUrl`
│   ├── visitor-client.ts    # chat-widget visitor simulator (Centrifugo channel `chat:<tenant>`)
│   └── pages/               # page objects: sign-in, shell, data tables, chat, billing, products
└── tests/
    ├── auth.spec.ts             # login, validation, guard redirects, sign-out
    ├── navigation.spec.ts       # sidebar, kbar (Cmd+K), redirects, theme toggle
    ├── overview.spec.ts         # stat cards + parallel-route streaming
    ├── customers.spec.ts        # search/URL state, edit, delete, empty state
    ├── websites.spec.ts         # search, embed-code wizard, edit, delete
    ├── widget-modifier.spec.ts  # customer→website cascade + deep links
    ├── engage.spec.ts           # engage tabs: traffic table/filters, profile, campaigns/goals
    ├── chat.spec.ts             # visitor⇄Centrifugo⇄agent realtime flows (serial)
    ├── ai-chat.spec.ts          # scripted streaming demo
    ├── profile-notifications.spec.ts  # profile form + notification center
    ├── billing.spec.ts          # plans list/filter/sort, new-plan validation, failed-create path
    ├── archives.spec.ts         # archived-chat viewer: search, tag filter, sort, notes, panels
    ├── products.spec.ts         # product table, form validation, create/delete, edit page, 404
    ├── forms.spec.ts            # basic / advanced / multi-step / sheet+dialog form demos
    ├── misc-pages.spec.ts       # settings+theme persistence, exclusive, workspaces, icons,
    │                            # react-query demo, 404s, sign-up + alias redirects
    └── responsive-a11y.spec.ts  # mobile sidebar sheet, Ctrl+B collapse, skip link, kbar keyboard
```

## Running

```bash
npm run e2e          # headless, starts dev server + Centrifugo automatically
npm run e2e:ui       # Playwright UI mode
npm run e2e:headed   # headed browser
npm run e2e:report   # open the last HTML report
```

Playwright's `webServer` config boots `npm run dev` (port 3000) and
`centrifugo --config=../../localrun/centrifugo/config.json` (port 8000;
set `CENTRIFUGO_BIN` if the binary is not on PATH) if they aren't already running, and
reuses them if they are.

## Environment

- `BILLING_API_URL` — optional; the billing spec reads the live billing service
  (default `https://billing-service-iota.vercel.app`) and skips if unreachable.
- `MONGODB_URI` (from `.env.local`) — required for the customers, websites and
  widget-modifier specs. Without it those specs **skip** instead of failing.
- `NEXT_PUBLIC_CHAT_WS_URL` — optional; defaults to `ws://localhost:8000/connection/websocket`.
- `E2E_BASE_URL` — optional override of `http://localhost:3000`.

## Data policy

Mutation tests never touch pre-existing rows. Each test seeds its own
documents (name-prefixed `E2E-PW …`) directly into the app database via
`support/db.ts`, asserts against exactly those rows, and the fixture deletes
them in teardown. A sweep also removes any prefixed rows older than an hour,
so crashed runs cannot accumulate residue.

## Known product gaps encoded in the suite

- Billing talks to a remote, shared service through Next **server actions**, so
  `page.route()` cannot mock it and the suite deliberately never lets a
  create/update/delete reach it (read-only + client-side validation + an
  aborted-request error path). Plan CRUD success flows are therefore not covered.
- `products.spec.ts` marks "deleted product disappears from the list" with
  `test.fail()`: the row action overrides the shared mutation `onSuccess`,
  dropping query invalidation, so the list goes stale. Remove the marker when fixed.

- `chat.spec.ts` runs serial because every open dashboard receives all
  `demo-tenant` traffic — the tenant id is currently hardcoded in the app.
- The widget-customization micro-frontend is an external deployable; the
  widget-modifier spec covers the dashboard-owned selection shell only.
