import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getCommonPinningStyles,
  getDefaultFilterOperator,
  getFilterOperators,
  getValidFilters
} from '@/lib/data-table';
import { dataTableConfig } from '@/config/data-table';

import type { ExtendedColumnFilter, FilterVariant } from '@/types/data-table';
import type { Column } from '@tanstack/react-table';

function makeColumn(overrides: Record<string, unknown> = {}) {
  return {
    getIsPinned: () => false,
    getIsLastColumn: () => false,
    getIsFirstColumn: () => false,
    getStart: () => 4,
    getAfter: () => 8,
    getSize: () => 120,
    ...overrides
  } as unknown as Column<unknown>;
}

describe('getCommonPinningStyles', () => {
  it('styles an unpinned column', () => {
    const styles = getCommonPinningStyles({ column: makeColumn() });
    expect(styles).toEqual({
      boxShadow: undefined,
      left: undefined,
      right: undefined,
      position: 'relative',
      background: undefined,
      width: 120,
      zIndex: 0
    });
  });

  it('styles the last left-pinned column with an inset shadow', () => {
    const styles = getCommonPinningStyles({
      column: makeColumn({
        getIsPinned: () => 'left',
        getIsLastColumn: (side: string) => side === 'left'
      })
    });
    expect(styles.boxShadow).toBe('-5px 0 5px -5px var(--border) inset');
    expect(styles.left).toBe('4px');
    expect(styles.right).toBeUndefined();
    expect(styles.position).toBe('sticky');
    expect(styles.background).toBe('var(--background)');
    expect(styles.zIndex).toBe(1);
  });

  it('styles a left-pinned column that is not last without a shadow', () => {
    const styles = getCommonPinningStyles({
      column: makeColumn({ getIsPinned: () => 'left' })
    });
    expect(styles.boxShadow).toBeUndefined();
    expect(styles.left).toBe('4px');
    expect(styles.position).toBe('sticky');
  });

  it('styles the first right-pinned column with an inset shadow', () => {
    const styles = getCommonPinningStyles({
      column: makeColumn({
        getIsPinned: () => 'right',
        getIsFirstColumn: (side: string) => side === 'right'
      })
    });
    expect(styles.boxShadow).toBe('5px 0 5px -5px var(--border) inset');
    expect(styles.right).toBe('8px');
    expect(styles.left).toBeUndefined();
  });

  it('styles a right-pinned column that is not first without a shadow', () => {
    const styles = getCommonPinningStyles({
      column: makeColumn({ getIsPinned: () => 'right' })
    });
    expect(styles.boxShadow).toBeUndefined();
    expect(styles.right).toBe('8px');
  });
});

describe('getFilterOperators', () => {
  it.each([
    ['text', dataTableConfig.textOperators],
    ['number', dataTableConfig.numericOperators],
    ['range', dataTableConfig.numericOperators],
    ['date', dataTableConfig.dateOperators],
    ['dateRange', dataTableConfig.dateOperators],
    ['boolean', dataTableConfig.booleanOperators],
    ['select', dataTableConfig.selectOperators],
    ['multiSelect', dataTableConfig.multiSelectOperators]
  ] as const)('returns the operators for the %s variant', (variant, expected) => {
    expect(getFilterOperators(variant)).toBe(expected);
  });

  it('falls back to text operators for an unknown variant', () => {
    expect(getFilterOperators('bogus' as FilterVariant)).toBe(dataTableConfig.textOperators);
  });
});

describe('getDefaultFilterOperator', () => {
  it('returns the first operator for a variant', () => {
    expect(getDefaultFilterOperator('text')).toBe('iLike');
    expect(getDefaultFilterOperator('number')).toBe('eq');
    expect(getDefaultFilterOperator('multiSelect')).toBe('inArray');
  });

  describe('with no configured operators', () => {
    afterEach(() => {
      vi.doUnmock('@/config/data-table');
      vi.resetModules();
    });

    it('falls back to iLike for text and eq otherwise', async () => {
      vi.resetModules();
      vi.doMock('@/config/data-table', () => ({
        dataTableConfig: {
          textOperators: [],
          numericOperators: [],
          dateOperators: [],
          selectOperators: [],
          multiSelectOperators: [],
          booleanOperators: []
        }
      }));
      const mod = await import('@/lib/data-table');
      expect(mod.getDefaultFilterOperator('text')).toBe('iLike');
      expect(mod.getDefaultFilterOperator('number')).toBe('eq');
    });
  });
});

describe('getValidFilters', () => {
  const base = { variant: 'text', filterId: 'f' } as const;

  it('keeps isEmpty and isNotEmpty filters regardless of value', () => {
    const filters = [
      { ...base, id: 'a', operator: 'isEmpty', value: '' },
      { ...base, id: 'b', operator: 'isNotEmpty', value: '' }
    ] as unknown as ExtendedColumnFilter<unknown>[];
    expect(getValidFilters(filters)).toEqual(filters);
  });

  it('keeps non-empty arrays and drops empty ones', () => {
    const kept = { ...base, id: 'a', operator: 'inArray', value: ['x'] };
    const dropped = { ...base, id: 'b', operator: 'inArray', value: [] };
    const filters = [kept, dropped] as unknown as ExtendedColumnFilter<unknown>[];
    expect(getValidFilters(filters)).toEqual([kept]);
  });

  it('keeps non-empty scalar values and drops empty, null and undefined ones', () => {
    const kept = { ...base, id: 'a', operator: 'eq', value: 'x' };
    const filters = [
      kept,
      { ...base, id: 'b', operator: 'eq', value: '' },
      { ...base, id: 'c', operator: 'eq', value: null },
      { ...base, id: 'd', operator: 'eq', value: undefined }
    ] as unknown as ExtendedColumnFilter<unknown>[];
    expect(getValidFilters(filters)).toEqual([kept]);
  });
});
