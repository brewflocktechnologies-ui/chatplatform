'use server';

import { endpoints } from '@/config/api-endpoints';
import { billingGet, billingRequest, pageParams, sortParam } from '@/lib/billing/client';
import { DEFAULT_PLAN_SORT } from '../lib/plan-sort';
import {
  PLAN_SORT_FIELDS,
  type Plan,
  type PlanFilters,
  type PlanMutationPayload,
  type PlansPage
} from './types';

/** Runs on the server, so the browser never calls the billing origin. */
export async function getPlans({ page, size, status, sort }: PlanFilters): Promise<PlansPage> {
  const params = pageParams(page, size);
  // Server actions take client input, and an unknown sort field makes the API return 500.
  params.set(
    'sort',
    sortParam(sort, PLAN_SORT_FIELDS, { fallback: DEFAULT_PLAN_SORT, defaultDir: 'desc' })!
  );
  return billingGet(status === 'active' ? endpoints.plans.active : endpoints.plans.list, params);
}

const writePlan = (method: 'POST' | 'PUT' | 'DELETE', path: string, body?: PlanMutationPayload) =>
  billingRequest<Plan>(method, path, {
    body,
    // The controller maps every service error to 404, so 404 isn't necessarily "missing".
    notFoundMessage: 'Plan not found, or the billing service failed'
  });

/** POST /api/plans → 201 with the created plan. */
export async function createPlan(data: PlanMutationPayload) {
  return writePlan('POST', endpoints.plans.list, data);
}

/** PUT /api/plans/{id} → 200 with the updated plan. Full replace. */
export async function updatePlan(id: number, data: PlanMutationPayload) {
  return writePlan('PUT', endpoints.plans.item(id), data);
}

export async function deletePlan(id: number) {
  return writePlan('DELETE', endpoints.plans.item(id));
}
