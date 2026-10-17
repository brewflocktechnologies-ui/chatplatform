import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/features/company/api/service', () => ({
  getCompanies: vi.fn(),
  getAllCompanies: vi.fn()
}));

import { getAllCompanies, getCompanies } from '@/features/company/api/service';
import {
  COMPANY_PAGE_SIZE,
  DEFAULT_COMPANY_FILTERS,
  allCompaniesQueryOptions,
  companiesQueryOptions,
  companyKeys
} from '@/features/company/api/queries';

beforeEach(() => vi.clearAllMocks());

describe('companyKeys', () => {
  it('exposes a stable root key', () => {
    expect(companyKeys.all).toEqual(['companies']);
  });

  it('builds list and "all" keys', () => {
    const filters = { page: 1, size: 10 };
    expect(companyKeys.list(filters)).toEqual(['companies', 'list', filters]);
    expect(companyKeys.everything()).toEqual(['companies', 'all', null]);
    const sort = { field: 'name' as const, dir: 'asc' as const };
    expect(companyKeys.everything(sort)).toEqual(['companies', 'all', sort]);
  });
});

describe('defaults', () => {
  it('starts on the first (0-based) page', () => {
    expect(DEFAULT_COMPANY_FILTERS).toEqual({ page: 0, size: COMPANY_PAGE_SIZE });
  });
});

describe('companiesQueryOptions', () => {
  it('keys on the filters and fetches them', async () => {
    const filters = { page: 2, size: 20 };
    const opts = companiesQueryOptions(filters);
    expect(opts.queryKey).toEqual(companyKeys.list(filters));

    vi.mocked(getCompanies).mockResolvedValue({} as never);
    await (opts.queryFn as () => Promise<unknown>)();
    expect(getCompanies).toHaveBeenCalledWith(filters);
  });
});

describe('allCompaniesQueryOptions', () => {
  it('caches for five minutes and fetches everything with the sort', async () => {
    const sort = { field: 'name' as const, dir: 'desc' as const };
    const opts = allCompaniesQueryOptions(sort);
    expect(opts.queryKey).toEqual(companyKeys.everything(sort));
    expect(opts.staleTime).toBe(5 * 60 * 1000);

    vi.mocked(getAllCompanies).mockResolvedValue([]);
    await (opts.queryFn as () => Promise<unknown>)();
    expect(getAllCompanies).toHaveBeenCalledWith(sort);
  });
});
