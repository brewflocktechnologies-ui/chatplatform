import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { searchParamsCache } from '@/lib/searchparams';
import { companiesQueryOptions } from '../api/queries';
import { parseSortParam } from '../lib/company-sort';
import { CompanyTable } from './company-table';

export default function CompanyListing() {
  const page = searchParamsCache.get('page');
  const perPage = searchParamsCache.get('perPage');
  const name = searchParamsCache.get('name');
  const sort = parseSortParam(searchParamsCache.get('sort'));

  const queryClient = getQueryClient();

  // A search loads everything on the client instead, so there is nothing to prefetch.
  if (!name) {
    void queryClient.prefetchQuery(companiesQueryOptions({ page: page - 1, size: perPage, sort }));
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CompanyTable />
    </HydrationBoundary>
  );
}
