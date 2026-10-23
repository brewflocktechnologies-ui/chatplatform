import { expect, type APIRequestContext } from '@playwright/test';

/**
 * Customers come from the billing service (GET /api/customers), not the app
 * database, so tests read a real one instead of seeding it. The service runs
 * on serverless hosting: the first call after idle can answer 500, so retry.
 */
const ORIGIN = process.env.CUSTOMERS_API_URL ?? 'https://billing-service-iota.vercel.app';

export interface LiveCustomer {
  /** The id websites store as `customerId`. */
  id: string;
  /** The label the dashboard shows for the customer. */
  name: string;
  email: string;
}

export async function firstLiveCustomer(request: APIRequestContext): Promise<LiveCustomer> {
  let status = 0;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await request.get(`${ORIGIN}/api/customers`, {
      params: { page: 0, size: 1, sort: 'email,asc' },
      timeout: 60_000
    });
    status = res.status();
    if (res.ok()) {
      const body = (await res.json()) as { content: { id: number; email: string }[] };
      const [customer] = body.content;
      expect(customer, 'the customers API returned no customers').toBeTruthy();
      return { id: String(customer.id), name: customer.email, email: customer.email };
    }
    await new Promise((resolve) => setTimeout(resolve, 1_500));
  }
  throw new Error(`Customers API kept responding with ${status}`);
}
