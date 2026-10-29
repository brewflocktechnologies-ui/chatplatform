import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { searchParamsCache } from '@/lib/searchparams';
import { customersQueryOptions } from '../api/queries';
import { parseSortParam } from '../lib/customer-sort';
import { CustomersTable } from './customers-table';

export default function CustomerListingPage() {
  const page = searchParamsCache.get('page');
  const pageLimit = searchParamsCache.get('perPage');
  const sort = parseSortParam(searchParamsCache.get('sort'));

  const queryClient = getQueryClient();

  void queryClient.query(customersQueryOptions({ page: page - 1, size: pageLimit, sort })).catch(() => {});

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CustomersTable />
    </HydrationBoundary>
  );
}
