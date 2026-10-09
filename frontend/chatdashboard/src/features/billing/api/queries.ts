import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { getPlans } from './service';
import type { PlanFilters } from './types';

export const PLAN_PAGE_SIZE = 10;

/** Initial view; the server prefetches exactly this so first paint has data. */
export const DEFAULT_PLAN_FILTERS: PlanFilters = {
  page: 0,
  size: PLAN_PAGE_SIZE,
  status: 'all'
};

export const planKeys = {
  all: ['plans'] as const,
  list: (filters: PlanFilters) => [...planKeys.all, 'list', filters] as const
};

export const plansQueryOptions = (filters: PlanFilters) =>
  queryOptions({
    queryKey: planKeys.list(filters),
    queryFn: () => getPlans(filters),
    placeholderData: keepPreviousData
  });
