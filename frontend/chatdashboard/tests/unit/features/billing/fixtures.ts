import type { Plan, PlansPage } from '@/features/billing/api/types';

export function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: 1,
    name: 'Starter',
    description: 'For small teams',
    amountMonthly: 10,
    amountAnnually: 100,
    freePlan: false,
    defaultPlan: false,
    active: true,
    custom: false,
    smartChatModule: null,
    managedAccountsModule: null,
    companyIds: [7, 9],
    planProductPrice: null,
    createdDate: '2026-10-06T06:28:42',
    modifiedDate: '2026-10-06T06:28:42',
    createdByUserId: null,
    modifiedByUserId: null,
    ...overrides
  };
}

export function makePage(content: Plan[], overrides: Partial<PlansPage> = {}): PlansPage {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    number: 0,
    size: 10,
    ...overrides
  };
}
