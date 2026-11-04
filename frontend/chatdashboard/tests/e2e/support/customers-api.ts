import { expect, type APIRequestContext } from '@playwright/test';
import { mockBillingRequest } from '../../../src/lib/billing/mock';

/**
 * Customers come from the billing service (GET /api/customers), not the app
 * database, so tests read a real one instead of seeding it. The service runs
 * on serverless hosting: the first call after idle can answer 500, so retry.
 *
 * With `IS_MOCK=true` the app serves the in-memory billing mock instead of the
 * service, so the customer is read from that same mock (the live service is
 * never called, and an outage or disabled deployment cannot fail the suite).
 */
const ORIGIN = process.env.CUSTOMERS_API_URL ?? 'https://billing-service-iota.vercel.app';

export interface LiveCustomer {
  /** The id websites store as `customerId`. */
  id: string;
  /** The label the dashboard shows for the customer. */
  name: string;
  email: string;
}

type CustomerPage = { content: { id: number; email: string }[] };

function toLiveCustomer(page: CustomerPage): LiveCustomer {
  const [customer] = page.content;
  expect(customer, 'the customers API returned no customers').toBeTruthy();
  return { id: String(customer.id), name: customer.email, email: customer.email };
}

function nthMockCustomer(nth: number): LiveCustomer {
  const result = mockBillingRequest<CustomerPage>('GET', '/api/customers', {
    query: new URLSearchParams({ page: String(nth), size: '1', sort: 'email,asc' })
  });
  expect(result.ok, 'the billing mock did not list customers').toBe(true);
  return toLiveCustomer((result as { ok: true; data: CustomerPage }).data);
}

/**
 * The first customer by email, or the `nth` (0-based) when a test must not share
 * a customer with tests that seed websites for the first one in parallel.
 */
export async function firstLiveCustomer(
  request: APIRequestContext,
  nth = 0
): Promise<LiveCustomer> {
  if (process.env.IS_MOCK === 'true') return nthMockCustomer(nth);

  let status = 0;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await request.get(`${ORIGIN}/api/customers`, {
      params: { page: nth, size: 1, sort: 'email,asc' },
      timeout: 60_000
    });
    status = res.status();
    if (res.ok()) return toLiveCustomer((await res.json()) as CustomerPage);
    await new Promise((resolve) => setTimeout(resolve, 1_500));
  }
  throw new Error(`Customers API kept responding with ${status}`);
}
