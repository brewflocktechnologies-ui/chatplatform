import { describe, it, expect } from 'vitest';
import { matchesSearch } from '@/features/customers/lib/customer-search';
import type { Customer } from '@/features/customers/api/types';

const customer: Customer = {
  id: 53,
  externalId: 'cust-aadhi-98765',
  email: 'Aadhi@example.com',
  activePlan: { id: 1, name: 'Premium' },
  billingAddress: {
    line1: '456 Oak Avenue',
    line2: null,
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94105',
    country: 'USA'
  },
  creditCard: { brand: 'MasterCard', numberLastFourDigits: '5678' },
  invoices: []
};

describe('matchesSearch', () => {
  it.each(['aadhi@', 'CUST-AADHI', 'san fran', 'usa', 'mastercard', 'premium', '53'])(
    'matches %s case-insensitively',
    (query) => {
      expect(matchesSearch(customer, query)).toBe(true);
    }
  );

  it('matches everything for a blank query', () => {
    expect(matchesSearch(customer, '   ')).toBe(true);
  });

  it('does not match unrelated text', () => {
    expect(matchesSearch(customer, 'zzz')).toBe(false);
  });

  it('copes with a customer that has no address, card or plan', () => {
    const bare: Customer = {
      ...customer,
      activePlan: null,
      billingAddress: null,
      creditCard: null
    };
    expect(matchesSearch(bare, 'aadhi')).toBe(true);
    expect(matchesSearch(bare, 'usa')).toBe(false);
  });
});
