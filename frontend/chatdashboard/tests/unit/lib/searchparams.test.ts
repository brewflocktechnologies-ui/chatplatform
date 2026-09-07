import { describe, expect, it } from 'vitest';
import { searchParams, searchParamsCache, serialize } from '@/lib/searchparams';

describe('searchParams', () => {
  it('defaults page to 1 and perPage to 10', () => {
    expect(searchParams.page.parseServerSide(undefined)).toBe(1);
    expect(searchParams.perPage.parseServerSide(undefined)).toBe(10);
  });

  it('parses integer values', () => {
    expect(searchParams.page.parseServerSide('3')).toBe(3);
  });

  it('parses string filters as plain strings', () => {
    expect(searchParams.name.parseServerSide('john')).toBe('john');
    expect(searchParams.status.parseServerSide(undefined)).toBeNull();
  });
});

describe('searchParamsCache', () => {
  it('parses a search params record with defaults applied', () => {
    const parsed = searchParamsCache.parse({ page: '2', name: 'jane' });
    expect(parsed.page).toBe(2);
    expect(parsed.perPage).toBe(10);
    expect(parsed.name).toBe('jane');
    expect(parsed.gender).toBeNull();
  });
});

describe('serialize', () => {
  it('serializes non-default values into a query string', () => {
    expect(serialize({ page: 2, name: 'jane' })).toBe('?page=2&name=jane');
  });

  it('omits default values', () => {
    expect(serialize({ page: 1, perPage: 10 })).toBe('');
  });
});
