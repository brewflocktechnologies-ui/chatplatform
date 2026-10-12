import { describe, it, expect } from 'vitest';
import { toPayload } from '@/features/billing/lib/plan-payload';
import { makePlan } from '../fixtures';

describe('toPayload', () => {
  it('carries every writable field so a PUT replaces nothing by accident', () => {
    const plan = makePlan({
      smartChatModule: { enabled: true },
      planProductPrice: { stripeId: 'p_1' }
    });

    expect(toPayload(plan)).toEqual({
      name: 'Starter',
      description: 'For small teams',
      amountMonthly: 10,
      amountAnnually: 100,
      active: true,
      freePlan: false,
      defaultPlan: false,
      custom: false,
      companyIds: [7, 9],
      smartChatModule: { enabled: true },
      managedAccountsModule: null,
      planProductPrice: { stripeId: 'p_1' }
    });
  });

  it('never includes server-managed fields', () => {
    const payload = toPayload(makePlan({ createdByUserId: 3, modifiedByUserId: 4 }));
    for (const key of [
      'id',
      'createdDate',
      'modifiedDate',
      'createdByUserId',
      'modifiedByUserId'
    ]) {
      expect(payload).not.toHaveProperty(key);
    }
  });

  it('applies overrides on top of the plan', () => {
    expect(toPayload(makePlan(), { active: false, name: 'Renamed' })).toMatchObject({
      active: false,
      name: 'Renamed',
      amountMonthly: 10
    });
  });
});
