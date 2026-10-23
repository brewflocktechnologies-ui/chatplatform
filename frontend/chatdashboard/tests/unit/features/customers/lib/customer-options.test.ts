import { describe, it, expect } from 'vitest';
import { toCustomerOption } from '@/features/customers/lib/customer-options';
import type { Customer } from '@/features/customers/api/types';

describe('toCustomerOption', () => {
  it('uses the stringified id as the value and the email as the label', () => {
    const customer = { id: 103, email: 'mode1@example.com' } as Customer;
    expect(toCustomerOption(customer)).toEqual({ value: '103', label: 'mode1@example.com' });
  });
});
