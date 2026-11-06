import { queryOptions } from '@tanstack/react-query';
import { entityRoots } from '@/lib/cache/keys';
import { getWebsites } from './service';
import type { WebsiteFilters } from './types';

export type { Website } from './types';

export const websiteKeys = {
  all: entityRoots.websites,
  list: (filters: WebsiteFilters) => [...websiteKeys.all, 'list', filters] as const,
  detail: (id: string) => [...websiteKeys.all, 'detail', id] as const
};

export const websitesQueryOptions = (filters: WebsiteFilters) =>
  queryOptions({
    queryKey: websiteKeys.list(filters),
    queryFn: () => getWebsites(filters)
  });
