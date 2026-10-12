import { describe, it, expect } from 'vitest';
import { planSchema } from '@/features/billing/schemas/plan';

const valid = {
  name: 'Growth',
  description: '',
  amountMonthly: 10,
  amountAnnually: 100,
  active: true,
  freePlan: false,
  defaultPlan: false,
  custom: false
};

const messages = (input: unknown) => {
  const result = planSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.message);
};

describe('planSchema', () => {
  it('accepts a valid paid plan', () => {
    expect(planSchema.safeParse(valid).success).toBe(true);
  });

  it('requires a name and caps it at 100 characters', () => {
    expect(messages({ ...valid, name: '   ' })).toContain('Plan name is required');
    expect(messages({ ...valid, name: 'a'.repeat(101) })).toContain(
      'Name must be 100 characters or fewer'
    );
    expect(planSchema.safeParse({ ...valid, name: 'a'.repeat(100) }).success).toBe(true);
  });

  it('caps the description at 500 characters', () => {
    expect(messages({ ...valid, description: 'a'.repeat(501) })).toContain(
      'Description must be 500 characters or fewer'
    );
    expect(planSchema.safeParse({ ...valid, description: 'a'.repeat(500) }).success).toBe(true);
  });

  it('requires whole, non-negative prices', () => {
    expect(messages({ ...valid, amountMonthly: 9.5 })).toContain('Use a whole number');
    expect(messages({ ...valid, amountAnnually: -1 })).toContain('Price cannot be negative');
    expect(messages({ ...valid, amountMonthly: undefined })).toContain('Monthly price is required');
  });

  it('requires a monthly price above 0 unless the plan is free', () => {
    expect(messages({ ...valid, amountMonthly: 0 })).toContain(
      'Paid plans need a monthly price above 0'
    );
    expect(planSchema.safeParse({ ...valid, amountMonthly: 0, freePlan: true }).success).toBe(true);
  });
});
