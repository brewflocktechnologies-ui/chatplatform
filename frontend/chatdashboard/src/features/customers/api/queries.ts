import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { entityRoots } from '@/lib/cache/keys';
import { cachePolicy } from '@/lib/cache/policy';
import { getAllCustomers, getCustomers } from './service';
import type { Customer, CustomerFilters, CustomerSort } from './types';

export type { Customer };

export const CUSTOMER_PAGE_SIZE = 10;

/** `page` is 0-based, as the billing API expects. */
export const DEFAULT_CUSTOMER_FILTERS: CustomerFilters = {
  page: 0,
  size: CUSTOMER_PAGE_SIZE
};

export const customerKeys = {
  all: entityRoots.customers,
  list: (filters: CustomerFilters) => [...customerKeys.all, 'list', filters] as const,
  everything: (sort?: CustomerSort) => [...customerKeys.all, 'all', sort ?? null] as const
};

export const customersQueryOptions = (filters: CustomerFilters) =>
  queryOptions({
    queryKey: customerKeys.list(filters),
    queryFn: () => getCustomers(filters),
    placeholderData: keepPreviousData
  });

/** Every customer, for client-side search and the customer dropdowns. */
export const allCustomersQueryOptions = (sort?: CustomerSort) =>
  queryOptions({
    queryKey: customerKeys.everything(sort),
    queryFn: () => getAllCustomers(sort),
    ...cachePolicy('reference'),
    placeholderData: keepPreviousData
  });
