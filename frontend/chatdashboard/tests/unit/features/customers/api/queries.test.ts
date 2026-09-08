import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/features/customers/api/service', () => ({
  getCustomers: vi.fn()
}));

import { getCustomers } from '@/features/customers/api/service';
import { customerKeys, customersQueryOptions } from '@/features/customers/api/queries';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('customerKeys', () => {
  it('exposes a stable root key', () => {
    expect(customerKeys.all).toEqual(['customers']);
  });

  it('builds list keys from filters', () => {
    const filters = { page: 2, search: 'foo' };
    expect(customerKeys.list(filters)).toEqual(['customers', 'list', filters]);
  });

  it('builds detail keys from an id', () => {
    expect(customerKeys.detail('abc')).toEqual(['customers', 'detail', 'abc']);
  });
});

describe('customersQueryOptions', () => {
  it('uses the list key for the given filters', () => {
    const filters = { page: 1, limit: 10 };
    const options = customersQueryOptions(filters);
    expect(options.queryKey).toEqual(customerKeys.list(filters));
  });

  it('delegates the query function to getCustomers', async () => {
    const response = { success: true, customers: [] };
    vi.mocked(getCustomers).mockResolvedValue(response as never);

    const filters = { search: 'acme' };
    const options = customersQueryOptions(filters);
    const result = await (options.queryFn as () => unknown)();

    expect(getCustomers).toHaveBeenCalledWith(filters);
    expect(result).toBe(response);
  });
});
