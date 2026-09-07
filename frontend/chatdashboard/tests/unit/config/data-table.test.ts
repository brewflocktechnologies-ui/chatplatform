import { describe, it, expect } from 'vitest';
import { dataTableConfig } from '@/config/data-table';

describe('dataTableConfig', () => {
  it('defines text operators with label/value pairs', () => {
    expect(dataTableConfig.textOperators.map((o) => o.value)).toEqual([
      'iLike',
      'notILike',
      'eq',
      'ne',
      'isEmpty',
      'isNotEmpty'
    ]);
    for (const op of dataTableConfig.textOperators) {
      expect(typeof op.label).toBe('string');
      expect(op.label.length).toBeGreaterThan(0);
    }
  });

  it('defines numeric operators including range comparisons', () => {
    expect(dataTableConfig.numericOperators.map((o) => o.value)).toEqual([
      'eq',
      'ne',
      'lt',
      'lte',
      'gt',
      'gte',
      'isBetween',
      'isEmpty',
      'isNotEmpty'
    ]);
  });

  it('defines date operators including relative comparison', () => {
    expect(dataTableConfig.dateOperators.map((o) => o.value)).toEqual([
      'eq',
      'ne',
      'lt',
      'gt',
      'lte',
      'gte',
      'isBetween',
      'isRelativeToToday',
      'isEmpty',
      'isNotEmpty'
    ]);
  });

  it('defines select and multi-select operators', () => {
    expect(dataTableConfig.selectOperators.map((o) => o.value)).toEqual([
      'eq',
      'ne',
      'isEmpty',
      'isNotEmpty'
    ]);
    expect(dataTableConfig.multiSelectOperators.map((o) => o.value)).toEqual([
      'inArray',
      'notInArray',
      'isEmpty',
      'isNotEmpty'
    ]);
  });

  it('defines boolean operators and sort orders', () => {
    expect(dataTableConfig.booleanOperators.map((o) => o.value)).toEqual(['eq', 'ne']);
    expect(dataTableConfig.sortOrders).toEqual([
      { label: 'Asc', value: 'asc' },
      { label: 'Desc', value: 'desc' }
    ]);
  });

  it('lists every filter variant, operator and join operator', () => {
    expect(dataTableConfig.filterVariants).toEqual([
      'text',
      'number',
      'range',
      'date',
      'dateRange',
      'boolean',
      'select',
      'multiSelect'
    ]);
    expect(dataTableConfig.operators).toContain('isBetween');
    expect(dataTableConfig.operators).toHaveLength(14);
    expect(dataTableConfig.joinOperators).toEqual(['and', 'or']);
  });
});
