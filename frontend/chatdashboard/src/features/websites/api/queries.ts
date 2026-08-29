import { queryOptions } from '@tanstack/react-query';
import { getWebsites } from './service';
import type { Website, WebsiteFilters } from './types';

export type { Website };

export const websiteKeys = {
  all: ['websites'] as const,
  list: (filters: WebsiteFilters) => [...websiteKeys.all, 'list', filters] as const,
  detail: (id: string) => [...websiteKeys.all, 'detail', id] as const
};

export const websitesQueryOptions = (filters: WebsiteFilters) =>
  queryOptions({
    queryKey: websiteKeys.list(filters),
    queryFn: () => getWebsites(filters)
  });
