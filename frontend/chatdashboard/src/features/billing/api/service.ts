'use server';

import type { PlansPage } from './types';

const BILLING_API_URL =
  process.env.BILLING_API_URL ?? 'https://billing-service-eta.vercel.app';

/** First `size` active plans. Runs on the server, so the browser never calls the billing origin. */
export async function getActivePlans(size = 4): Promise<PlansPage> {
  const res = await fetch(
    `${BILLING_API_URL}/api/plans/active?page=0&size=${size}`,
    {
      cache: 'no-store',
    },
  );
  if (!res.ok) throw new Error(`Billing API responded with ${res.status}`);
  return res.json();
}
