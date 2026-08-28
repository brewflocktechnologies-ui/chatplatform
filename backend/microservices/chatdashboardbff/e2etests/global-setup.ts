import { request } from '@playwright/test';

// Fail fast with an actionable message instead of 20 confusing ECONNREFUSED
// test failures when the stack isn't up.
export default async function globalSetup() {
  const baseURL = process.env.BFF_BASE_URL ?? 'http://localhost:8100';
  const ctx = await request.newContext();
  try {
    // Any HTTP response (even 503) proves the BFF process is up; the tests
    // themselves prove accountservice/Postgres by exercising real CRUD.
    await ctx.get(`${baseURL}/api/v1/tenants`, { timeout: 5000 });
  } catch {
    throw new Error(
      `BFF is not reachable at ${baseURL}. Start the stack first:\n` +
        `  bash localrun/start.sh\n` +
        `or\n` +
        `  docker compose -f backend/microservices/docker-compose.yml up -d`,
    );
  } finally {
    await ctx.dispose();
  }
}
