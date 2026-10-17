import { describe, expect, it } from 'vitest';
import { COLUMN_SORT_FIELDS, parseSortParam } from '@/features/company/lib/company-sort';
import { COMPANY_SORT_FIELDS } from '@/features/company/api/types';

describe('COLUMN_SORT_FIELDS', () => {
  it('only maps to fields the billing API accepts', () => {
    for (const field of Object.values(COLUMN_SORT_FIELDS)) {
      expect(COMPANY_SORT_FIELDS).toContain(field);
    }
  });
});

describe('parseSortParam', () => {
  it('returns undefined for empty input', () => {
    expect(parseSortParam(undefined)).toBeUndefined();
    expect(parseSortParam(null)).toBeUndefined();
    expect(parseSortParam('')).toBeUndefined();
  });

  it('maps an ascending column to its API field', () => {
    expect(parseSortParam('[{"id":"name","desc":false}]')).toEqual({ field: 'name', dir: 'asc' });
  });

  it('maps a descending column to its API field', () => {
    expect(parseSortParam('[{"id":"city","desc":true}]')).toEqual({
      field: 'headquarters.city',
      dir: 'desc'
    });
  });

  it('uses only the first entry', () => {
    expect(parseSortParam('[{"id":"email","desc":false},{"id":"name","desc":true}]')).toEqual({
      field: 'companyDetails.contactEmail',
      dir: 'asc'
    });
  });

  it('ignores columns that are not sortable', () => {
    expect(parseSortParam('[{"id":"plans","desc":false}]')).toBeUndefined();
    expect(parseSortParam('[]')).toBeUndefined();
  });

  it('ignores malformed JSON', () => {
    expect(parseSortParam('not json')).toBeUndefined();
  });
});
