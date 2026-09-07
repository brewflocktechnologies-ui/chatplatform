import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Query } from '@tanstack/react-query';

const fakeQuery = (status: string) => ({ state: { status } }) as unknown as Query;

describe('getQueryClient', () => {
  afterEach(() => {
    vi.doUnmock('@tanstack/react-query');
    vi.resetModules();
  });

  it('reuses a single client in the browser', async () => {
    vi.resetModules();
    const { getQueryClient } = await import('@/lib/query-client');

    const first = getQueryClient();
    const second = getQueryClient();

    expect(first).toBe(second);
    expect(first.getDefaultOptions().queries?.staleTime).toBe(60 * 1000);
  });

  it('dehydrates default-dehydratable and pending queries only', async () => {
    vi.resetModules();
    const { getQueryClient } = await import('@/lib/query-client');
    const shouldDehydrateQuery = getQueryClient().getDefaultOptions().dehydrate
      ?.shouldDehydrateQuery;

    expect(shouldDehydrateQuery?.(fakeQuery('success'))).toBe(true);
    expect(shouldDehydrateQuery?.(fakeQuery('pending'))).toBe(true);
    expect(shouldDehydrateQuery?.(fakeQuery('error'))).toBe(false);
  });

  it('creates a fresh client per call on the server', async () => {
    vi.resetModules();
    vi.doMock('@tanstack/react-query', async (importOriginal) => {
      const actual = await importOriginal<typeof import('@tanstack/react-query')>();
      return { ...actual, isServer: true };
    });
    const { getQueryClient } = await import('@/lib/query-client');

    const first = getQueryClient();
    const second = getQueryClient();

    expect(first).not.toBe(second);
  });
});
