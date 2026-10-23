import { describe, expect, it } from 'vitest';
import { matchesSearch } from '@/features/company/lib/company-search';
import { makeCompany } from '../fixtures';

describe('matchesSearch', () => {
  const company = makeCompany();

  it('matches everything for a blank query', () => {
    expect(matchesSearch(company, '')).toBe(true);
    expect(matchesSearch(company, '   ')).toBe(true);
  });

  it.each([
    ['name', 'acme'],
    ['id', '1'],
    ['email', 'HELLO@ACME'],
    ['phone', '9123'],
    ['website', 'acme.io'],
    ['industry', 'fintech'],
    ['city', 'bengal'],
    ['state', 'karnat'],
    ['country', 'india']
  ])('matches on %s, ignoring case', (_field, query) => {
    expect(matchesSearch(company, query)).toBe(true);
  });

  it('trims the query', () => {
    expect(matchesSearch(company, '  fintech  ')).toBe(true);
  });

  it('does not match fields outside the table', () => {
    expect(matchesSearch(company, '45 mount')).toBe(false);
    expect(matchesSearch(company, '560001')).toBe(false);
  });

  it('returns false when nothing matches', () => {
    expect(matchesSearch(company, 'zzz')).toBe(false);
  });

  it('copes with missing details and headquarters', () => {
    const bare = makeCompany({ companyDetails: null, headquarters: null });
    expect(matchesSearch(bare, 'acme')).toBe(true);
    expect(matchesSearch(bare, 'fintech')).toBe(false);
  });

  it('skips null fields', () => {
    const sparse = makeCompany({
      companyDetails: {
        contactEmail: null,
        contactPhone: null,
        website: null,
        industry: null,
        employeeCount: null
      }
    });
    expect(matchesSearch(sparse, 'null')).toBe(false);
  });
});
