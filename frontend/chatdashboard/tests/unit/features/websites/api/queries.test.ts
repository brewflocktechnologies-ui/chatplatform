import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/features/websites/api/service', () => ({
  getWebsites: vi.fn()
}));

import { getWebsites } from '@/features/websites/api/service';
import { websiteKeys, websitesQueryOptions } from '@/features/websites/api/queries';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('websiteKeys', () => {
  it('exposes a stable root key', () => {
    expect(websiteKeys.all).toEqual(['websites']);
  });

  it('builds list keys from filters', () => {
    const filters = { page: 1, category: 'saas' };
    expect(websiteKeys.list(filters)).toEqual(['websites', 'list', filters]);
  });

  it('builds detail keys from an id', () => {
    expect(websiteKeys.detail('w-1')).toEqual(['websites', 'detail', 'w-1']);
  });
});

describe('websitesQueryOptions', () => {
  it('uses the list key for the given filters', () => {
    const filters = { search: 'example' };
    const options = websitesQueryOptions(filters);
    expect(options.queryKey).toEqual(websiteKeys.list(filters));
  });

  it('delegates the query function to getWebsites', async () => {
    const response = { success: true, websites: [] };
    vi.mocked(getWebsites).mockResolvedValue(response as never);

    const filters = { customerId: 'cust-1' };
    const options = websitesQueryOptions(filters);
    const result = await (options.queryFn as () => unknown)();

    expect(getWebsites).toHaveBeenCalledWith(filters);
    expect(result).toBe(response);
  });
});
