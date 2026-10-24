import { describe, it, expect } from 'vitest';
import {
  belongsToCustomer,
  tenantIdOf,
  websiteLink
} from '@/features/poc-website/lib/website-link';
import type { PocWebsite } from '@/features/poc-website/api/types';

const site = (overrides: Partial<PocWebsite> = {}) =>
  ({
    id: 'w1',
    protocol: 'HTTPS',
    domain: 'ref-test.example.com',
    companyId: '20452',
    customerId: '7953',
    ...overrides
  }) as PocWebsite;

describe('websiteLink', () => {
  it('joins a lowercased protocol and the domain', () => {
    expect(websiteLink(site())).toBe('https://ref-test.example.com');
    expect(websiteLink(site({ protocol: 'http' }))).toBe('http://ref-test.example.com');
  });
});

describe('belongsToCustomer', () => {
  it('matches by customer id, or by company id for older rows', () => {
    expect(belongsToCustomer(site(), '7953')).toBe(true);
    expect(belongsToCustomer(site(), '20452')).toBe(true);
    expect(belongsToCustomer(site(), '1')).toBe(false);
  });

  it('never matches a blank customer', () => {
    expect(belongsToCustomer(site({ customerId: '', companyId: '' }), '')).toBe(false);
  });
});

describe('tenantIdOf', () => {
  it('uses the company, falling back to the customer', () => {
    expect(tenantIdOf(site())).toBe('20452');
    expect(tenantIdOf(site({ companyId: '' }))).toBe('7953');
  });
});
