import { queryOptions } from '@tanstack/react-query';
import { getCustomers } from './service';
import type { Customer, CustomerFilters } from './types';

export type { Customer };

export const customerKeys = {
  all: ['customers'] as const,
  list: (filters: CustomerFilters) => [...customerKeys.all, 'list', filters] as const,
  detail: (id: string) => [...customerKeys.all, 'detail', id] as const
};

export const customersQueryOptions = (filters: CustomerFilters) =>
  queryOptions({
    queryKey: customerKeys.list(filters),
    queryFn: () => getCustomers(filters)
  });
