'use client';

import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { getSortingStateParser } from '@/lib/parsers';
import { websitesQueryOptions } from '../../api/queries';
import { columns } from './columns';

const columnIds = columns.map((c) => c.id).filter(Boolean) as string[];

export function WebsitesTable() {
  const [params] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(10),
    name: parseAsString,
    category: parseAsString,
    sort: getSortingStateParser(columnIds).withDefault([])
  });

  const filters = {
    page: params.page,
    limit: params.perPage,
    ...(params.name && { search: params.name }),
    ...(params.category && { category: params.category }),
    ...(params.sort.length > 0 && { sort: JSON.stringify(params.sort) })
  };

  // useQuery (not useSuspenseQuery): getWebsites is a server action, and invoking it
  // during render when the filters change makes Next update the Router mid-render.
  // keepPreviousData keeps the old rows on screen while the new page loads.
  const { data, isPending, isError, isFetching, refetch } = useQuery({
    ...websitesQueryOptions(filters),
    placeholderData: keepPreviousData
  });

  const pageCount = Math.ceil((data?.total_websites ?? 0) / params.perPage);

  const { table } = useDataTable({
    data: data?.websites ?? [],
    columns,
    pageCount,
    shallow: true,
    debounceMs: 500,
    initialState: {
      columnPinning: { right: ['actions'] }
    }
  });

  return (
    <DataTable
      table={table}
      isLoading={isPending}
      isError={isError}
      onRetry={() => void refetch()}
      isRefreshing={isFetching && !isPending}
    >
      <DataTableToolbar table={table} />
    </DataTable>
  );
}

export function WebsitesTableSkeleton() {
  return (
    <div className='flex flex-1 animate-pulse flex-col gap-4'>
      <div className='bg-muted h-10 w-full rounded' />
      <div className='bg-muted h-96 w-full rounded-lg' />
      <div className='bg-muted h-10 w-full rounded' />
    </div>
  );
}
