import { describe, it, expect } from 'vitest';
import { DEFAULT_PLAN_SORT, nextSort } from '@/features/billing/lib/plan-sort';

describe('nextSort', () => {
  it('defaults to newest first', () => {
    expect(DEFAULT_PLAN_SORT).toEqual({ field: 'id', dir: 'desc' });
  });

  it('starts a new column ascending', () => {
    expect(nextSort(DEFAULT_PLAN_SORT, 'name')).toEqual({ field: 'name', dir: 'asc' });
    expect(nextSort({ field: 'name', dir: 'desc' }, 'amountMonthly')).toEqual({
      field: 'amountMonthly',
      dir: 'asc'
    });
  });

  it('cycles ascending, descending, then back to the default for the same column', () => {
    const asc = nextSort(DEFAULT_PLAN_SORT, 'amountAnnually');
    const desc = nextSort(asc, 'amountAnnually');
    expect(desc).toEqual({ field: 'amountAnnually', dir: 'desc' });
    expect(nextSort(desc, 'amountAnnually')).toEqual(DEFAULT_PLAN_SORT);
  });
});
