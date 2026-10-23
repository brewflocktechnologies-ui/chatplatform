'use server';

import { billingRequest } from '@/lib/billing/client';
import { POC_WEBSITES_PATH, pocWebsitesOrigin } from './config';
import type { PocWebsite, PocWebsiteMutationPayload } from './types';

const writeWebsite = (
  method: 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: PocWebsiteMutationPayload
) =>
  billingRequest<PocWebsite | null>(method, path, {
    origin: pocWebsitesOrigin(),
    body,
    notFoundMessage: 'Website not found'
  });

/** Ids are opaque strings, and server actions take client input, so never splice them raw. */
const itemPath = (id: string) => `${POC_WEBSITES_PATH}/${encodeURIComponent(id)}`;

/** POST /api/v1/websites → the created website. */
export async function createPocWebsite(data: PocWebsiteMutationPayload) {
  return writeWebsite('POST', POC_WEBSITES_PATH, data);
}

/** PUT /api/v1/websites/{id} → the updated website. */
export async function updatePocWebsite(id: string, data: PocWebsiteMutationPayload) {
  return writeWebsite('PUT', itemPath(id), data);
}

export async function deletePocWebsite(id: string) {
  return writeWebsite('DELETE', itemPath(id));
}
