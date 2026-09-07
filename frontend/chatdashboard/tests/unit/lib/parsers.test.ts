import { describe, expect, it } from 'vitest';
import { getSortingStateParser, getFiltersStateParser } from '@/lib/parsers';
import type { FilterItemSchema } from '@/lib/parsers';

type Row = { name: string; email: string };

describe('getSortingStateParser', () => {
  const parser = getSortingStateParser<Row>(['name', 'email']);

  it('parses a valid sorting state', () => {
    expect(parser.parse('[{"id":"name","desc":true}]')).toEqual([{ id: 'name', desc: true }]);
  });

  it('returns null for invalid JSON', () => {
    expect(parser.parse('not json')).toBeNull();
  });

  it('returns null when the schema does not match', () => {
    expect(parser.parse('[{"id":"name"}]')).toBeNull();
  });

  it('returns null when an id is not a valid column', () => {
    expect(parser.parse('[{"id":"unknown","desc":false}]')).toBeNull();
  });

  it('accepts any id when no column ids are given', () => {
    const open = getSortingStateParser<Row>();
    expect(open.parse('[{"id":"anything","desc":false}]')).toEqual([
      { id: 'anything', desc: false }
    ]);
  });

  it('accepts a Set of column ids', () => {
    const fromSet = getSortingStateParser<Row>(new Set(['name']));
    expect(fromSet.parse('[{"id":"name","desc":false}]')).toEqual([{ id: 'name', desc: false }]);
    expect(fromSet.parse('[{"id":"email","desc":false}]')).toBeNull();
  });

  it('serializes to JSON', () => {
    expect(parser.serialize([{ id: 'name', desc: true }])).toBe('[{"id":"name","desc":true}]');
  });

  it('compares equal states as equal', () => {
    expect(
      parser.eq(
        [{ id: 'name', desc: true }],
        [{ id: 'name', desc: true }]
      )
    ).toBe(true);
  });

  it('compares states of different lengths as not equal', () => {
    expect(parser.eq([{ id: 'name', desc: true }], [])).toBe(false);
  });

  it('compares states with differing items as not equal', () => {
    expect(
      parser.eq(
        [{ id: 'name', desc: true }],
        [{ id: 'name', desc: false }]
      )
    ).toBe(false);
    expect(
      parser.eq(
        [{ id: 'name', desc: true }],
        [{ id: 'email', desc: true }]
      )
    ).toBe(false);
  });

  it('handles a missing counterpart item', () => {
    type SortState = Parameters<NonNullable<typeof parser.eq>>[0];
    const first = [{ id: 'name', desc: true }] as SortState;
    const sparse = [undefined] as unknown as SortState;
    expect(parser.eq(first, sparse)).toBe(false);
  });
});

describe('getFiltersStateParser', () => {
  const parser = getFiltersStateParser<Row>(['name', 'email']);
  const filter: FilterItemSchema = {
    id: 'name',
    value: 'john',
    variant: 'text',
    operator: 'iLike',
    filterId: 'f1'
  };

  it('parses a valid filters state', () => {
    expect(parser.parse(JSON.stringify([filter]))).toEqual([filter]);
  });

  it('parses array values', () => {
    const multi: FilterItemSchema = {
      id: 'email',
      value: ['a', 'b'],
      variant: 'multiSelect',
      operator: 'inArray',
      filterId: 'f2'
    };
    expect(parser.parse(JSON.stringify([multi]))).toEqual([multi]);
  });

  it('returns null for invalid JSON', () => {
    expect(parser.parse('{bad')).toBeNull();
  });

  it('returns null when the schema does not match', () => {
    expect(parser.parse('[{"id":"name","value":"x"}]')).toBeNull();
  });

  it('returns null when an id is not a valid column', () => {
    expect(parser.parse(JSON.stringify([{ ...filter, id: 'unknown' }]))).toBeNull();
  });

  it('accepts any id when no column ids are given', () => {
    const open = getFiltersStateParser<Row>();
    expect(open.parse(JSON.stringify([{ ...filter, id: 'whatever' }]))).toEqual([
      { ...filter, id: 'whatever' }
    ]);
  });

  it('accepts a Set of column ids', () => {
    const fromSet = getFiltersStateParser<Row>(new Set(['name']));
    expect(fromSet.parse(JSON.stringify([filter]))).toEqual([filter]);
  });

  it('serializes to JSON', () => {
    expect(parser.serialize([filter] as never)).toBe(JSON.stringify([filter]));
  });

  it('compares equal states as equal', () => {
    expect(parser.eq([filter] as never, [{ ...filter }] as never)).toBe(true);
  });

  it('compares states of different lengths as not equal', () => {
    expect(parser.eq([filter] as never, [] as never)).toBe(false);
  });

  it('compares states with differing fields as not equal', () => {
    expect(parser.eq([filter] as never, [{ ...filter, id: 'email' }] as never)).toBe(false);
    expect(parser.eq([filter] as never, [{ ...filter, value: 'jane' }] as never)).toBe(false);
    expect(parser.eq([filter] as never, [{ ...filter, variant: 'number' }] as never)).toBe(false);
    expect(parser.eq([filter] as never, [{ ...filter, operator: 'eq' }] as never)).toBe(false);
  });

  it('handles a missing counterpart item', () => {
    const sparse = [undefined] as never;
    expect(parser.eq([filter] as never, sparse)).toBe(false);
  });
});
