'use server';

import type {
  CompaniesPage,
  Company,
  CompanyFilters,
  CompanyMutationPayload,
  CompanyResult,
  CompanySort
} from './types';
import { COMPANY_SORT_FIELDS } from './types';

const BILLING_API_URL = process.env.BILLING_API_URL ?? 'https://billing-service-eta.vercel.app';
const COMPANIES_PATH = '/api/v1/companies';

/** Runs on the server, so the browser never calls the billing origin. */
export async function getCompanies({ page, size, sort }: CompanyFilters): Promise<CompaniesPage> {
  const params = new URLSearchParams({
    page: String(Math.max(0, Math.trunc(page) || 0)),
    size: String(Math.min(100, Math.max(1, Math.trunc(size) || 10)))
  });
  const sortParam = toSortParam(sort);
  if (sortParam) params.set('sort', sortParam);
  const res = await fetch(`${BILLING_API_URL}${COMPANIES_PATH}?${params}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Billing API responded with ${res.status}`);
  return res.json();
}

/** Server actions take client input, and an unknown sort field makes the API return 500. */
function toSortParam(sort?: CompanySort) {
  if (!sort || !COMPANY_SORT_FIELDS.includes(sort.field)) return undefined;
  return `${sort.field},${sort.dir === 'desc' ? 'desc' : 'asc'}`;
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

async function writeCompany(
  path: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body?: CompanyMutationPayload
): Promise<CompanyResult<Company | null>> {
  let res: Response;
  try {
    res = await fetch(`${BILLING_API_URL}${path}`, {
      method,
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    return { ok: false, status: 0, message: 'Billing service is unreachable' };
  }

  const data = await res.json().catch(() => null);
  if (res.ok) return { ok: true, data: data as Company | null };

  return {
    ok: false,
    status: res.status,
    message:
      res.status === 404
        ? 'Company not found'
        : (data?.error ?? data?.message ?? `Billing API responded with ${res.status}`),
    fieldErrors: data?.fieldErrors
  };
}

/** POST /api/v1/companies → the created company. */
export async function createCompany(data: CompanyMutationPayload) {
  return writeCompany(COMPANIES_PATH, 'POST', data);
}

/** PUT /api/v1/companies/{id} → the updated company. Full replace. */
export async function updateCompany(id: number, data: CompanyMutationPayload) {
  return writeCompany(`${COMPANIES_PATH}/${Math.trunc(id)}`, 'PUT', data);
}

export async function deleteCompany(id: number) {
  return writeCompany(`${COMPANIES_PATH}/${Math.trunc(id)}`, 'DELETE');
}
