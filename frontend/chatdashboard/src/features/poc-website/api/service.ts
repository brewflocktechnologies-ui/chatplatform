'use server';

import { endpoints, origins } from '@/config/api-endpoints';
import { billingRequest, pageParams, type PageResponse } from '@/lib/billing/client';
import type { PocWebsite, PocWebsiteMutationPayload } from './types';

const writeWebsite = (
  method: 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: PocWebsiteMutationPayload
) =>
  billingRequest<PocWebsite | null>(method, path, {
    origin: origins.pocWebsites(),
    body,
    notFoundMessage: 'Website not found'
  });

/**
 * Every registered website. The API ignores customer/company filters, so callers
 * filter the result themselves. Failures throw so a query enters its error state.
 */
export async function getAllPocWebsites(): Promise<PocWebsite[]> {
  const fetchPage = async (page: number) => {
    const result = await billingRequest<PageResponse<PocWebsite>>('GET', endpoints.pocWebsites.list, {
      origin: origins.pocWebsites(),
      query: pageParams(page, 100)
    });
    if (!result.ok) throw new Error(`Websites API responded with ${result.status}`);
    return result.data;
  };

  const first = await fetchPage(0);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) => fetchPage(i + 1))
  );
  return [first, ...rest].flatMap((p) => p.content);
}

/** POST /api/v1/websites → the created website. */
export async function createPocWebsite(data: PocWebsiteMutationPayload) {
  return writeWebsite('POST', endpoints.pocWebsites.list, data);
}

/** PUT /api/v1/websites/{id} → the updated website. */
export async function updatePocWebsite(id: string, data: PocWebsiteMutationPayload) {
  return writeWebsite('PUT', endpoints.pocWebsites.item(id), data);
}

export async function deletePocWebsite(id: string) {
  return writeWebsite('DELETE', endpoints.pocWebsites.item(id));
}
