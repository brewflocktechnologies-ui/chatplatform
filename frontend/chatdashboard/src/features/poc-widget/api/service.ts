'use server';

import { endpoints } from '@/config/api-endpoints';
import { billingRequest, type ApiResult } from '@/lib/billing/client';
import { WIDGET_POSITIONS, WIDGET_THEMES } from './types';
import type { PocWidget, PocWidgetMutationPayload } from './types';

/** The API answers 500 for an unknown enum, so reject it here with a readable message. */
function invalidEnum(data: PocWidgetMutationPayload): ApiResult<never> | null {
  const fieldErrors: Record<string, string> = {};
  if (!WIDGET_POSITIONS.includes(data.position)) fieldErrors.position = 'Unknown position';
  if (!WIDGET_THEMES.includes(data.theme)) fieldErrors.theme = 'Unknown theme';
  return Object.keys(fieldErrors).length
    ? { ok: false, status: 400, message: 'Input validation errors', fieldErrors }
    : null;
}

const writeWidget = (
  method: 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: PocWidgetMutationPayload
) => billingRequest<PocWidget | null>(method, path, { body, notFoundMessage: 'Widget not found' });

/** POST /api/chat-assistant/widgets → the created widget. */
export async function createPocWidget(data: PocWidgetMutationPayload) {
  return invalidEnum(data) ?? writeWidget('POST', endpoints.pocWidgets.list, data);
}

/** PUT /api/chat-assistant/widgets/{id} → the updated widget. */
export async function updatePocWidget(id: number, data: PocWidgetMutationPayload) {
  return invalidEnum(data) ?? writeWidget('PUT', endpoints.pocWidgets.item(id), data);
}

export async function deletePocWidget(id: number) {
  return writeWidget('DELETE', endpoints.pocWidgets.item(id));
}
