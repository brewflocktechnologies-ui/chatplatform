'use server';

import { billingRequest } from '@/lib/billing/client';
import type { PocConfig, PocConfigMutationPayload, PocConfigWriteBody } from './types';

const CONFIGS_PATH = '/api/v1/widget-configs';

// The dashboard has no real user identity for this API yet, so audit fields carry a fixed name.
const AUDIT_USER = 'me';

/** Ids are opaque strings, and server actions take client input, so never splice them raw. */
const itemPath = (id: string) => `${CONFIGS_PATH}/${encodeURIComponent(id)}`;

const writeConfig = (method: 'POST' | 'PUT' | 'DELETE', path: string, body?: PocConfigWriteBody) =>
  billingRequest<PocConfig | null>(method, path, {
    body,
    notFoundMessage: 'Config not found'
  });

/** POST /api/v1/widget-configs → the created config. */
export async function createPocConfig(data: PocConfigMutationPayload) {
  return writeConfig('POST', CONFIGS_PATH, {
    ...data,
    createdBy: AUDIT_USER,
    updatedBy: AUDIT_USER,
    version: 0,
    new: false
  });
}

/**
 * PUT /api/v1/widget-configs/{id} → the updated config. `version` guards against stale edits,
 * and `createdBy` is sent back so the update doesn't overwrite who created it.
 */
export async function updatePocConfig(
  id: string,
  data: PocConfigMutationPayload,
  version: number,
  createdBy: string | null
) {
  return writeConfig('PUT', itemPath(id), {
    ...data,
    id,
    createdBy: createdBy ?? AUDIT_USER,
    updatedBy: AUDIT_USER,
    version,
    new: false
  });
}

export async function deletePocConfig(id: string) {
  return writeConfig('DELETE', itemPath(id));
}
