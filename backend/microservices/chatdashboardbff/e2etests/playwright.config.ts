import { defineConfig } from '@playwright/test';

// Pure API tests - no browser is ever launched, so no `npx playwright
// install` is needed. The stack (BFF :8100 + accountservice :9095 + Postgres)
// must already be running: `bash localrun/start.sh` or
// `docker compose -f backend/microservices/docker-compose.yml up -d`.
// globalSetup fails fast with a clear message when it isn't.
export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  use: {
    baseURL: process.env.BFF_BASE_URL ?? 'http://localhost:8100',
  },
  // CRUD lifecycle tests share state (created tenant id) - keep them ordered
  // in one worker instead of pretending they're independent.
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
});
