import { defineConfig, devices } from '@playwright/test';
import { loadLocalEnv } from './e2e/support/env';

// Make .env.local (MONGODB_URI, NEXT_PUBLIC_CHAT_WS_URL, …) visible to the
// test runner process — the Next dev server loads it on its own.
loadLocalEnv();

const APP_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const WS_HEALTH_URL =
  (process.env.NEXT_PUBLIC_CHAT_WS_URL || 'ws://localhost:8088')
    .replace(/^ws/, 'http')
    .replace(/\/$/, '') + '/health';

export default defineConfig({
  testDir: './e2e/tests',
  outputDir: './e2e/test-results',

  // Mutation specs (customers, websites) share one MongoDB database, but each
  // test operates only on rows it seeded with a run-unique prefix, so specs
  // can still run fully parallel.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : undefined,

  reporter: process.env.CI
    ? [['github'], ['html', { outputFolder: 'e2e/playwright-report', open: 'never' }]]
    : [['list'], ['html', { outputFolder: 'e2e/playwright-report', open: 'never' }]],

  timeout: 60_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL: APP_URL,
    // 'on-first-retry' (Playwright's recommended default): recording a trace
    // for every test hits a Windows file race in artifact cleanup.
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'off',
    // The chat conversation list and theme selector are lg-only (>=1024px).
    viewport: { width: 1440, height: 900 }
  },

  projects: [
    {
      name: 'setup',
      testDir: './e2e/setup',
      testMatch: /auth\.setup\.ts/
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        // Every dashboard workflow assumes the mock-auth session captured by
        // the setup project. auth.spec.ts opts out per-test.
        storageState: 'e2e/.auth/agent.json',
        permissions: ['clipboard-read', 'clipboard-write']
      }
    }
  ],

  webServer: [
    {
      command: 'npm run dev',
      url: APP_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      cwd: __dirname
    },
    {
      // Standalone WebSocket hub the chat workflow talks to (frontend/server).
      command: 'node ../server/server.mjs',
      url: WS_HEALTH_URL,
      reuseExistingServer: true,
      timeout: 30_000,
      cwd: __dirname
    }
  ]
});
