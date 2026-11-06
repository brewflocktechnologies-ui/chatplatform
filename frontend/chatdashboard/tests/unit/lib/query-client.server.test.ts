// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.resetModules();
});

describe('getQueryClient — server', () => {
  it('does not retry a failed prefetch on the server', async () => {
    vi.resetModules();

    const { getQueryClient } = await import('@/lib/query-client');

    expect(getQueryClient().getDefaultOptions().queries?.retry).toBe(0);
  });

  it('creates a fresh client per call on the server', async () => {
    vi.resetModules();

    const { getQueryClient } = await import('@/lib/query-client');

    const first = getQueryClient();
    const second = getQueryClient();

    expect(first).not.toBe(second);
  });
});
