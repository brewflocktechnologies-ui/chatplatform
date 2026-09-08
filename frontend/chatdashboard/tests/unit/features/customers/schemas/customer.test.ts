import { describe, it, expect } from 'vitest';
import { customerSchema } from '@/features/customers/schemas/customer';

const valid = {
  name: 'Acme Corp',
  email: 'contact@acme.com',
  country: 'Germany',
  activePlanName: 'pro',
  status: 'active',
  crm: true,
  analytics: false
};

function firstMessage(data: unknown) {
  const result = customerSchema.safeParse(data);
  return result.success ? null : result.error.issues[0].message;
}

describe('customerSchema', () => {
  it('accepts a fully valid customer', () => {
    const result = customerSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(valid);
    }
  });

  it('rejects a name shorter than 2 characters', () => {
    expect(firstMessage({ ...valid, name: 'A' })).toBe('Name must be at least 2 characters');
  });

  it('rejects an invalid email', () => {
    expect(firstMessage({ ...valid, email: 'not-an-email' })).toBe('Please enter a valid email');
  });

  it('rejects a country shorter than 2 characters', () => {
    expect(firstMessage({ ...valid, country: 'D' })).toBe('Country is required');
  });

  it('rejects an empty plan', () => {
    expect(firstMessage({ ...valid, activePlanName: '' })).toBe('Please select a plan');
  });

  it('rejects an empty status', () => {
    expect(firstMessage({ ...valid, status: '' })).toBe('Please select a status');
  });

  it('rejects non-boolean crm and analytics flags', () => {
    expect(customerSchema.safeParse({ ...valid, crm: 'yes' }).success).toBe(false);
    expect(customerSchema.safeParse({ ...valid, analytics: 'no' }).success).toBe(false);
  });

  it('collects multiple issues at once', () => {
    const result = customerSchema.safeParse({ ...valid, name: '', email: 'nope' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
    }
  });
});
