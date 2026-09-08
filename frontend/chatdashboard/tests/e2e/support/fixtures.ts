import { test as base, expect } from '@playwright/test';
import { TestDb, hasDb } from './db';

/**
 * Shared test fixtures.
 *
 * - `db`: per-test MongoDB seeder that mirrors the app's server-action data
 *   shapes and self-cleans in teardown. Tests that need it call
 *   `skipWithoutDb()` first so runs without MONGODB_URI degrade gracefully.
 * - `wsUrl`: the chat hub URL the dashboard itself connects to.
 */

interface Fixtures {
  db: TestDb;
  wsUrl: string;
}

export const test = base.extend<Fixtures>({
  db: async ({}, use) => {
    const db = new TestDb();
    await use(db);
    if (hasDb()) {
      await db.cleanup().catch(() => {});
    }
    await db.close().catch(() => {});
  },
  wsUrl: async ({}, use) => {
    await use(process.env.NEXT_PUBLIC_CHAT_WS_URL || 'ws://localhost:8088');
  }
});

export { expect };

export function skipWithoutDb(): void {
  test.skip(
    !hasDb(),
    'MONGODB_URI is not configured — data-backed workflows need the app database'
  );
}
