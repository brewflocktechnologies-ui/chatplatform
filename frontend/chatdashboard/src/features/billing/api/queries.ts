import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { entityRoots } from '@/lib/cache/keys';
import { cachePolicy } from '@/lib/cache/policy';
import { DEFAULT_PLAN_SORT } from '../lib/plan-sort';
import { getPlans } from './service';
import type { PlanFilters } from './types';

export const PLAN_PAGE_SIZE = 10;

export const DEFAULT_PLAN_FILTERS: PlanFilters = {
  page: 0,
  size: PLAN_PAGE_SIZE,
  status: 'all',
  sort: DEFAULT_PLAN_SORT
};

export const planKeys = {
  all: entityRoots.plans,
  list: (filters: PlanFilters) =>
    [...planKeys.all, 'list', filters] as const
};

export const plansQueryOptions = (filters: PlanFilters) =>
  queryOptions({
    queryKey: planKeys.list(filters),
    queryFn: () => getPlans(filters),
    ...cachePolicy('reference'),
    placeholderData: keepPreviousData
  });