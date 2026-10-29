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
    expect(first.getDefaultOptions().queries).toMatchObject({ staleTime: 60 * 1000 });
  });

  it('keeps list data for an hour and fetches even when the browser reports offline', async () => {
    vi.resetModules();
    const { getQueryClient } = await import('@/lib/query-client');
    const options = getQueryClient().getDefaultOptions();

    expect(options.queries).toMatchObject({
      gcTime: 60 * 60 * 1000,
      networkMode: 'always',
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: 'always'
    });
    expect(options.mutations).toMatchObject({ networkMode: 'always' });
  });

  it('dehydrates default-dehydratable and pending queries only', async () => {
    vi.resetModules();
    const { getQueryClient } = await import('@/lib/query-client');
    const shouldDehydrateQuery =
      getQueryClient().getDefaultOptions().dehydrate?.shouldDehydrateQuery;

    expect(shouldDehydrateQuery?.(fakeQuery('success'))).toBe(true);
    expect(shouldDehydrateQuery?.(fakeQuery('pending'))).toBe(true);
    expect(shouldDehydrateQuery?.(fakeQuery('error'))).toBe(false);
  });
});
