import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/features/customers/api/service', () => ({
  getCustomers: vi.fn(),
  getAllCustomers: vi.fn()
}));

import { getAllCustomers, getCustomers } from '@/features/customers/api/service';
import {
  allCustomersQueryOptions,
  customerKeys,
  customersQueryOptions
} from '@/features/customers/api/queries';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('customerKeys', () => {
  it('exposes a stable root key', () => {
    expect(customerKeys.all).toEqual(['customers']);
  });

  it('builds list keys from filters', () => {
    const filters = { page: 2, size: 10 };
    expect(customerKeys.list(filters)).toEqual(['customers', 'list', filters]);
  });

  it('builds the everything key from the sort, or null', () => {
    const sort = { field: 'email', dir: 'asc' } as const;
    expect(customerKeys.everything(sort)).toEqual(['customers', 'all', sort]);
    expect(customerKeys.everything()).toEqual(['customers', 'all', null]);
  });
});

describe('customersQueryOptions', () => {
  it('uses the list key for the given filters', () => {
    const filters = { page: 0, size: 10 };
    expect(customersQueryOptions(filters).queryKey).toEqual(customerKeys.list(filters));
  });

  it('delegates the query function to getCustomers', async () => {
    const response = { content: [], totalPages: 0 };
    vi.mocked(getCustomers).mockResolvedValue(response as never);

    const filters = { page: 1, size: 20 };
    const result = await (customersQueryOptions(filters).queryFn as () => unknown)();

    expect(getCustomers).toHaveBeenCalledWith(filters);
    expect(result).toBe(response);
  });
});

describe('allCustomersQueryOptions', () => {
  it('delegates to getAllCustomers with the sort and caches for five minutes', async () => {
    const rows = [{ id: 1 }];
    vi.mocked(getAllCustomers).mockResolvedValue(rows as never);

    const sort = { field: 'email', dir: 'asc' } as const;
    const options = allCustomersQueryOptions(sort);
    const result = await (options.queryFn as () => unknown)();

    expect(options.queryKey).toEqual(customerKeys.everything(sort));
    expect(options.staleTime).toBe(5 * 60 * 1000);
    expect(getAllCustomers).toHaveBeenCalledWith(sort);
    expect(result).toBe(rows);
  });
});
