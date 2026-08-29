import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { searchParamsCache } from '@/lib/searchparams';
import { websitesQueryOptions } from '../api/queries';
import { WebsitesTable } from './websites-table';

export default function WebsiteListingPage() {
  const page = searchParamsCache.get('page');
  const search = searchParamsCache.get('name');
  const pageLimit = searchParamsCache.get('perPage');
  const category = searchParamsCache.get('category');
  const sort = searchParamsCache.get('sort');

  const filters = {
    page,
    limit: pageLimit,
    ...(search && { search }),
    ...(category && { category }),
    ...(sort && { sort })
  };

  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(websitesQueryOptions(filters));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <WebsitesTable />
    </HydrationBoundary>
  );
}
