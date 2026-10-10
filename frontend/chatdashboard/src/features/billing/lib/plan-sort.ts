import type { PlanSort, PlanSortField } from '../api/types';

/** Newest first. Also the stable order that keeps edited plans from jumping around. */
export const DEFAULT_PLAN_SORT: PlanSort = { field: 'id', dir: 'desc' };

/** Header click cycle for a column: ascending → descending → back to the default order. */
export function nextSort(current: PlanSort, field: PlanSortField): PlanSort {
  if (current.field !== field) return { field, dir: 'asc' };
  if (current.dir === 'asc') return { field, dir: 'desc' };
  return DEFAULT_PLAN_SORT;
}
