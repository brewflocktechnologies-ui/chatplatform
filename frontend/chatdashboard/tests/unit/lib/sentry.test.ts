import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const captureException = vi.hoisted(() => vi.fn());
vi.mock('@sentry/nextjs', () => ({ captureException }));

async function load() {
  vi.resetModules();
  return import('@/lib/sentry');
}

beforeEach(() => {
  captureException.mockClear();
  vi.unstubAllEnvs();
});
afterEach(() => vi.unstubAllEnvs());

describe('captureClientError', () => {
  it('does nothing without a DSN', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', '');
    const { captureClientError } = await load();
    await captureClientError(new Error('x'));
    expect(captureException).not.toHaveBeenCalled();
  });

  it('does nothing when explicitly disabled', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://k@example.ingest.sentry.io/1');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DISABLED', '1');
    const { captureClientError } = await load();
    await captureClientError(new Error('x'));
    expect(captureException).not.toHaveBeenCalled();
  });

  it('reports the error and reuses the lazily imported SDK', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://k@example.ingest.sentry.io/1');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DISABLED', '');
    const { captureClientError } = await load();
    const e1 = new Error('one');
    const e2 = new Error('two');
    await captureClientError(e1);
    await captureClientError(e2);
    expect(captureException).toHaveBeenNthCalledWith(1, e1);
    expect(captureException).toHaveBeenNthCalledWith(2, e2);
  });
});
