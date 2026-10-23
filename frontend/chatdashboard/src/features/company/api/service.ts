'use server';

import { billingGet, billingRequest, pageParams, sortParam } from '@/lib/billing/client';
import type {
  CompaniesPage,
  Company,
  CompanyFilters,
  CompanyMutationPayload,
  CompanySort
} from './types';
import { COMPANY_SORT_FIELDS } from './types';

const COMPANIES_PATH = '/api/v1/companies';

/** Runs on the server, so the browser never calls the billing origin. */
export async function getCompanies({ page, size, sort }: CompanyFilters): Promise<CompaniesPage> {
  const params = pageParams(page, size);
  // Server actions take client input, and an unknown sort field makes the API return 500.
  const sortValue = sortParam(sort, COMPANY_SORT_FIELDS);
  if (sortValue) params.set('sort', sortValue);
  return billingGet(COMPANIES_PATH, params);
}

/**
 * The API has no search parameter, so searching walks every page once. The
 * client caches the result and filters it locally.
 */
export async function getAllCompanies(sort?: CompanySort): Promise<Company[]> {
  const first = await getCompanies({ page: 0, size: 100, sort });
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) =>
      getCompanies({ page: i + 1, size: 100, sort })
    )
  );
  return [first, ...rest].flatMap((p) => p.content);
}

const writeCompany = (
  method: 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: CompanyMutationPayload
) => billingRequest<Company | null>(method, path, { body, notFoundMessage: 'Company not found' });

/** POST /api/v1/companies → the created company. */
export async function createCompany(data: CompanyMutationPayload) {
  return writeCompany('POST', COMPANIES_PATH, data);
}

/** PUT /api/v1/companies/{id} → the updated company. Full replace. */
export async function updateCompany(id: number, data: CompanyMutationPayload) {
  return writeCompany('PUT', `${COMPANIES_PATH}/${Math.trunc(id)}`, data);
}

export async function deleteCompany(id: number) {
  return writeCompany('DELETE', `${COMPANIES_PATH}/${Math.trunc(id)}`);
}
