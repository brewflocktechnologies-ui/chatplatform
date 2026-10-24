'use server';

import { endpoints } from '@/config/api-endpoints';
import { billingRequest } from '@/lib/billing/client';
import type { PocConfig, PocConfigMutationPayload, PocConfigWriteBody } from './types';

// The dashboard has no real user identity for this API yet, so audit fields carry a fixed name.
const AUDIT_USER = 'me';

const writeConfig = (method: 'POST' | 'PUT' | 'DELETE', path: string, body?: PocConfigWriteBody) =>
  billingRequest<PocConfig | null>(method, path, {
    body,
    notFoundMessage: 'Config not found'
  });

/** POST /api/v1/widget-configs → the created config. */
export async function createPocConfig(data: PocConfigMutationPayload) {
  return writeConfig('POST', endpoints.pocConfigs.list, {
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
  return writeConfig('PUT', endpoints.pocConfigs.item(id), {
    ...data,
    id,
    createdBy: createdBy ?? AUDIT_USER,
    updatedBy: AUDIT_USER,
    version,
    new: false
  });
}

export async function deletePocConfig(id: string) {
  return writeConfig('DELETE', endpoints.pocConfigs.item(id));
}
