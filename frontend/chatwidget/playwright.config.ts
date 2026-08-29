import { defineConfig, devices } from '@playwright/test';

/**
 * E2E against the REAL artifact.
 *
 * The widget is built to dist/chat-widget.js (IIFE bundle) and tests load it
 * through a <script src data-client-id> tag — the exact surface every real
 * customer integrates with. The dev server is not used; `npm run build` runs
 * first so the served bundle is byte-for-byte what ships to the CDN.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 90_000,
  expect: {
    timeout: 20_000,
  },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
  ],

  webServer: {
    command: process.env.SKIP_BUILD ? 'node scripts/serve-e2e.mjs' : 'npm run build && node scripts/serve-e2e.mjs',
    url: 'http://localhost:5173/tests/e2e/harness/host.html',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});