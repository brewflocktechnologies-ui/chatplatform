import { endpoints } from '@/config/api-endpoints';
import {
  billingRequest,
  pageParams,
  sortParam,
  type PageResponse,
  type SortParam
} from '@/lib/billing/client';
import type { PocConfig } from './types';

/** The only fields GET /api/v1/widget-configs sorts on; any other makes it return 500. */
export const POC_CONFIG_SORT_FIELDS = ['configName', 'clientName', 'updatedAt'] as const;
export type PocConfigSortField = (typeof POC_CONFIG_SORT_FIELDS)[number];

/**
 * Pages through every widget config. `page` is 1-based, as in the URL.
 *
 * Server components only: it reads the billing env var. Failures come back as data so the
 * page can show them instead of throwing.
 */
export async function loadConfigs(
  page: number,
  size: number,
  sort?: SortParam
): Promise<{ configs: PocConfig[]; pageCount: number } | { error: string }> {
  const query = pageParams(page - 1, size);
  const sortValue = sortParam(sort, POC_CONFIG_SORT_FIELDS);
  if (sortValue) query.set('sort', sortValue);

  const result = await billingRequest<PageResponse<PocConfig>>('GET', endpoints.pocConfigs.list, {
    query
  });
  return result.ok
    ? { configs: result.data.content, pageCount: result.data.totalPages }
    : { error: result.message };
}
