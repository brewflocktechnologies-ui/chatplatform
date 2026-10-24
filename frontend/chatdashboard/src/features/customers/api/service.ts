'use server';

import { endpoints, origins } from '@/config/api-endpoints';
import { billingRequest, pageParams, sortParam } from '@/lib/billing/client';
import type { Customer, CustomerFilters, CustomerSort, CustomersPage } from './types';
import { CUSTOMER_SORT_FIELDS } from './types';

// The API serves pages slowly (a few seconds each) and queues parallel requests, so firing every
// page at once pushes the later ones past the request timeout and fails the whole list.
const PAGE_FETCH_CONCURRENCY = 6;

/** Like `Promise.all(items.map(fn))`, but with at most `limit` calls in flight. Order is kept. */
async function mapWithLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const results = Array.from<R>({ length: items.length });
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Runs on the server, so the browser never calls the billing origin. */
export async function getCustomers({ page, size, sort }: CustomerFilters): Promise<CustomersPage> {
  const params = pageParams(page, size);
  // Server actions take client input, and an unknown sort field makes the API return 500.
  const sortValue = sortParam(sort, CUSTOMER_SORT_FIELDS);
  if (sortValue) params.set('sort', sortValue);

  const result = await billingRequest<CustomersPage>('GET', endpoints.customers.list, {
    origin: origins.customers(),
    query: params
  });
  if (!result.ok) throw new Error(`Customers API responded with ${result.status}`);
  return result.data;
}

/**
 * The API has no search parameter, so searching (and the customer dropdowns)
 * walk every page once. The client caches the result and filters it locally.
 */
export async function getAllCustomers(sort?: CustomerSort): Promise<Customer[]> {
  const first = await getCustomers({ page: 0, size: 100, sort });
  const pages = Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) => i + 1);
  const rest = await mapWithLimit(pages, PAGE_FETCH_CONCURRENCY, (page) =>
    getCustomers({ page, size: 100, sort })
  );
  return [first, ...rest].flatMap((p) => p.content);
}

/**
 * One customer by id, or null when it doesn't exist. The dropdowns use it to label a saved
 * customer without waiting for the full list, which takes many seconds to walk.
 */
export async function getCustomer(id: string): Promise<Customer | null> {
  const result = await billingRequest<Customer>('GET', endpoints.customers.item(id), {
    origin: origins.customers(),
    notFoundMessage: 'Customer not found'
  });
  if (result.ok) return result.data;
  if (result.status === 404) return null;
  throw new Error(`Customers API responded with ${result.status}`);
}
