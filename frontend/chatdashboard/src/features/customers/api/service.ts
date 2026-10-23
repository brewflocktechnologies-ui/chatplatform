'use server';

import { billingRequest, pageParams, sortParam } from '@/lib/billing/client';
import { CUSTOMERS_PATH, customersOrigin } from './config';
import type { Customer, CustomerFilters, CustomerSort, CustomersPage } from './types';
import { CUSTOMER_SORT_FIELDS } from './types';

/** Runs on the server, so the browser never calls the billing origin. */
export async function getCustomers({ page, size, sort }: CustomerFilters): Promise<CustomersPage> {
  const params = pageParams(page, size);
  // Server actions take client input, and an unknown sort field makes the API return 500.
  const sortValue = sortParam(sort, CUSTOMER_SORT_FIELDS);
  if (sortValue) params.set('sort', sortValue);

  const result = await billingRequest<CustomersPage>('GET', CUSTOMERS_PATH, {
    origin: customersOrigin(),
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
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) =>
      getCustomers({ page: i + 1, size: 100, sort })
    )
  );
  return [first, ...rest].flatMap((p) => p.content);
}
