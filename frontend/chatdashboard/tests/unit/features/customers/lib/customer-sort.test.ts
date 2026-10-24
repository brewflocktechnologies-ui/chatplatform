import { describe, it, expect } from 'vitest';
import { COLUMN_SORT_FIELDS, parseSortParam } from '@/features/customers/lib/customer-sort';
import { CUSTOMER_SORT_FIELDS } from '@/features/customers/api/types';

describe('COLUMN_SORT_FIELDS', () => {
  it('only maps to fields the API accepts', () => {
    for (const field of Object.values(COLUMN_SORT_FIELDS)) {
      expect(CUSTOMER_SORT_FIELDS).toContain(field);
    }
  });
});

describe('parseSortParam', () => {
  it('maps the first sort entry to an API field and direction', () => {
    expect(parseSortParam('[{"id":"country","desc":true}]')).toEqual({
      field: 'billingAddress.country',
      dir: 'desc'
    });
    expect(parseSortParam('[{"id":"email","desc":false}]')).toEqual({
      field: 'email',
      dir: 'asc'
    });
  });

  it('ignores unsortable columns, malformed input and empty values', () => {
    expect(parseSortParam('[{"id":"invoices","desc":false}]')).toBeUndefined();
    expect(parseSortParam('not json')).toBeUndefined();
    expect(parseSortParam('[]')).toBeUndefined();
    expect(parseSortParam(null)).toBeUndefined();
    expect(parseSortParam(undefined)).toBeUndefined();
  });
});
