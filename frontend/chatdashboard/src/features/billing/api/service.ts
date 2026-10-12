'use server';

import { DEFAULT_PLAN_SORT } from '../lib/plan-sort';
import {
  PLAN_SORT_FIELDS,
  type Plan,
  type PlanFilters,
  type PlanMutationPayload,
  type PlanResult,
  type PlansPage
} from './types';

const BILLING_API_URL = process.env.BILLING_API_URL ?? 'https://billing-service-eta.vercel.app';

/** Runs on the server, so the browser never calls the billing origin. */
export async function getPlans({ page, size, status, sort }: PlanFilters): Promise<PlansPage> {
  const path = status === 'active' ? '/api/plans/active' : '/api/plans';
  // Server actions take client input, and an unknown sort field makes the API return 500.
  const { field, dir } = PLAN_SORT_FIELDS.includes(sort?.field) ? sort : DEFAULT_PLAN_SORT;
  const params = new URLSearchParams({
    page: String(Math.max(0, Math.trunc(page) || 0)),
    size: String(Math.min(100, Math.max(1, Math.trunc(size) || 10))),
    sort: `${field},${dir === 'asc' ? 'asc' : 'desc'}`
  });
  const res = await fetch(`${BILLING_API_URL}${path}?${params}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Billing API responded with ${res.status}`);
  return res.json();
}

async function writePlan(
  path: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body?: PlanMutationPayload
): Promise<PlanResult<Plan>> {
  let res: Response;
  try {
    res = await fetch(`${BILLING_API_URL}${path}`, {
      method,
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    return { ok: false, status: 0, message: 'Billing service is unreachable' };
  }

  const data = await res.json().catch(() => null);
  if (res.ok) return { ok: true, data: data as Plan };

  return {
    ok: false,
    status: res.status,
    // The controller maps every service error to 404, so 404 isn't necessarily "missing".
    message:
      res.status === 404
        ? 'Plan not found, or the billing service failed'
        : (data?.error ?? `Billing API responded with ${res.status}`),
    fieldErrors: data?.fieldErrors
  };
}

/** POST /api/plans → 201 with the created plan. */
export async function createPlan(data: PlanMutationPayload) {
  return writePlan('/api/plans', 'POST', data);
}

/** PUT /api/plans/{id} → 200 with the updated plan. Full replace. */
export async function updatePlan(id: number, data: PlanMutationPayload) {
  return writePlan(`/api/plans/${id}`, 'PUT', data);
}

export async function deletePlan(id: number) {
  return writePlan(`/api/plans/${id}`, 'DELETE');
}
