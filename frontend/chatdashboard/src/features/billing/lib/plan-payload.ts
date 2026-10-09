import type { Plan, PlanMutationPayload } from '../api/types';

/** Writable fields of an existing plan, so a PUT replaces nothing by accident. */
export function toPayload(
  plan: Plan,
  overrides: Partial<PlanMutationPayload> = {}
): PlanMutationPayload {
  return {
    name: plan.name,
    description: plan.description,
    amountMonthly: plan.amountMonthly,
    amountAnnually: plan.amountAnnually,
    active: plan.active,
    freePlan: plan.freePlan,
    defaultPlan: plan.defaultPlan,
    custom: plan.custom,
    companyIds: plan.companyIds,
    smartChatModule: plan.smartChatModule,
    managedAccountsModule: plan.managedAccountsModule,
    planProductPrice: plan.planProductPrice,
    ...overrides
  };
}
