import { describe, expect, it } from 'vitest';
import { companySchema } from '@/features/company/schemas/company';

const valid = {
  name: 'Acme',
  contactEmail: '',
  contactPhone: '',
  website: '',
  industry: '',
  streetAddress: '',
  city: '',
  state: '',
  postalCode: '',
  country: ''
};

const messages = (input: unknown) => {
  const result = companySchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.message);
};

describe('companySchema', () => {
  it('accepts a minimal company', () => {
    expect(companySchema.safeParse(valid).success).toBe(true);
  });

  it('requires a name of at least 2 characters', () => {
    expect(messages({ ...valid, name: 'A' })).toContain('Name must be at least 2 characters');
  });

  it('accepts an empty or valid email and rejects a bad one', () => {
    expect(companySchema.safeParse({ ...valid, contactEmail: 'a@b.co' }).success).toBe(true);
    expect(messages({ ...valid, contactEmail: 'nope' })).toContain('Please enter a valid email');
  });

  it('validates the employee count', () => {
    expect(companySchema.safeParse({ ...valid, employeeCount: 0 }).success).toBe(true);
    expect(messages({ ...valid, employeeCount: -1 })).toContain('Cannot be negative');
    expect(messages({ ...valid, employeeCount: 1.5 })).toContain('Must be a whole number');
  });
});
