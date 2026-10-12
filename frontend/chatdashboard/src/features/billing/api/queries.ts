import { keepPreviousData, queryOptions } from '@tanstack/react-query';
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
  all: ['plans'] as const,
  list: (filters: PlanFilters) =>
    [...planKeys.all, 'list', filters] as const
};

export const plansQueryOptions = (filters: PlanFilters) =>
  queryOptions({
    queryKey: planKeys.list(filters),
    queryFn: () => getPlans(filters),
    staleTime: 5 * 60 * 1000, // Fresh for 5 minutes
    gcTime: 30 * 60 * 1000,   // Retain inactive cache for 30 minutes
    placeholderData: keepPreviousData
  });