import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { getAllCompanies, getCompanies } from './service';
import type { CompanyFilters, CompanySort } from './types';

export const COMPANY_PAGE_SIZE = 10;

/** `page` is 0-based, as the billing API expects. */
export const DEFAULT_COMPANY_FILTERS: CompanyFilters = {
  page: 0,
  size: COMPANY_PAGE_SIZE
};

export const companyKeys = {
  all: ['companies'] as const,
  list: (filters: CompanyFilters) => [...companyKeys.all, 'list', filters] as const,
  everything: (sort?: CompanySort) => [...companyKeys.all, 'all', sort ?? null] as const
};

export const companiesQueryOptions = (filters: CompanyFilters) =>
  queryOptions({
    queryKey: companyKeys.list(filters),
    queryFn: () => getCompanies(filters),
    placeholderData: keepPreviousData
  });

/** Every company, for client-side search. Only fetched while a search is active. */
export const allCompaniesQueryOptions = (sort?: CompanySort) =>
  queryOptions({
    queryKey: companyKeys.everything(sort),
    queryFn: () => getAllCompanies(sort),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData
  });
