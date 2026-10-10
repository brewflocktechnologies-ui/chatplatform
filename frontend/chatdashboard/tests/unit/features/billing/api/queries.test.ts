import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/features/billing/api/service', () => ({
  getPlans: vi.fn()
}));

import { getPlans } from '@/features/billing/api/service';
import {
  DEFAULT_PLAN_FILTERS,
  PLAN_PAGE_SIZE,
  planKeys,
  plansQueryOptions
} from '@/features/billing/api/queries';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('planKeys', () => {
  it('exposes a stable root key', () => {
    expect(planKeys.all).toEqual(['plans']);
  });

  it('builds list keys from the filters', () => {
    const filters = {
      page: 1,
      size: 10,
      status: 'active' as const,
      sort: { field: 'name' as const, dir: 'asc' as const }
    };
    expect(planKeys.list(filters)).toEqual(['plans', 'list', filters]);
  });
});

describe('DEFAULT_PLAN_FILTERS', () => {
  it('starts on the first page of all plans', () => {
    expect(DEFAULT_PLAN_FILTERS).toEqual({
      page: 0,
      size: PLAN_PAGE_SIZE,
      status: 'all',
      sort: { field: 'id', dir: 'desc' }
    });
  });
});

describe('plansQueryOptions', () => {
  it('delegates the query function to getPlans', async () => {
    const page = { content: [], totalElements: 0 };
    vi.mocked(getPlans).mockResolvedValue(page as never);

    const options = plansQueryOptions(DEFAULT_PLAN_FILTERS);
    const result = await (options.queryFn as () => unknown)();

    expect(options.queryKey).toEqual(planKeys.list(DEFAULT_PLAN_FILTERS));
    expect(getPlans).toHaveBeenCalledWith(DEFAULT_PLAN_FILTERS);
    expect(result).toBe(page);
  });
});
