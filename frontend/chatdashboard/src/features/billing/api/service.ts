'use server';

import type {
  Plan,
  PlanFilters,
  PlanMutationPayload,
  PlansPage
} from './types';

const BILLING_API_URL =
  process.env.BILLING_API_URL ?? 'https://billing-service-eta.vercel.app';

async function billingFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BILLING_API_URL}${path}`, {
    cache: 'no-store',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers }
  });
  if (!res.ok) throw new Error(`Billing API responded with ${res.status}`);
  return res.status === 204 ? (undefined as T) : res.json();
}

/** Runs on the server, so the browser never calls the billing origin. */
export async function getPlans({
  page,
  size,
  status
}: PlanFilters): Promise<PlansPage> {
  const path = status === 'active' ? '/api/plans/active' : '/api/plans';
  return billingFetch(`${path}?page=${page}&size=${size}`);
}

export async function createPlan(data: PlanMutationPayload): Promise<Plan> {
  return billingFetch('/api/plans', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updatePlan(
  id: number,
  data: PlanMutationPayload
): Promise<Plan> {
  return billingFetch(`/api/plans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function deletePlan(id: number): Promise<void> {
  await billingFetch(`/api/plans/${id}`, { method: 'DELETE' });
}
