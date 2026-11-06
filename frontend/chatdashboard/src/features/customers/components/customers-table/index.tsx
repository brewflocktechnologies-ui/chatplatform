'use client';

import { useMemo } from 'react';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { useSearchablePagedQuery } from '@/hooks/use-searchable-paged-query';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { Icons } from '@/components/icons';
import { getSortingStateParser } from '@/lib/parsers';
import { allCustomersQueryOptions, customersQueryOptions } from '../../api/queries';
import { matchesSearch } from '../../lib/customer-search';
import { parseSortParam } from '../../lib/customer-sort';
import { CustomerFormSheetTrigger } from '../customer-form-sheet';
import { columns } from './columns';

const columnIds = columns.map((c) => c.id).filter(Boolean) as string[];

const SpinnerIcon = Icons.spinner;

export function CustomersTable() {
  const [params] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(10),
    email: parseAsString,
    sort: getSortingStateParser(columnIds).withDefault([])
  });

  const sort = useMemo(
    () => (params.sort.length > 0 ? parseSortParam(JSON.stringify(params.sort)) : undefined),
    [params.sort]
  );
  const search = params.email?.trim() ?? '';

  // Without a search the API pages and sorts for us (the URL is 1-based, the API 0-based);
  // a search loads everything once (the API can't search) and filters it here.
  const { rows, pageCount, active, searchingAll } = useSearchablePagedQuery({
    search,
    page: params.page,
    perPage: params.perPage,
    pagedOptions: customersQueryOptions({ page: params.page - 1, size: params.perPage, sort }),
    allOptions: allCustomersQueryOptions(sort),
    matches: matchesSearch
  });

  const { table } = useDataTable({
    data: rows,
    columns,
    pageCount,
    shallow: true,
    debounceMs: 500,
    initialState: {
      columnVisibility: { state: false }
    }
  });

  return (
    <DataTable
      table={table}
      minTableWidth
      isLoading={active.isPending}
      isError={active.isError}
      onRetry={() => void active.refetch()}
      isRefreshing={active.isFetching && !active.isPending}
    >
      <DataTableToolbar table={table} actions={<CustomerFormSheetTrigger />}>
        {searchingAll && (
          <output className='text-muted-foreground flex items-center gap-2 text-sm'>
            <SpinnerIcon className='h-4 w-4 animate-spin' />
            Searching all customers…
          </output>
        )}
      </DataTableToolbar>
    </DataTable>
  );
}

export function CustomersTableSkeleton() {
  return (
    <div className='flex flex-1 animate-pulse flex-col gap-4'>
      <div className='bg-muted h-10 w-full rounded' />
      <div className='bg-muted h-96 w-full rounded-lg' />
      <div className='bg-muted h-10 w-full rounded' />
    </div>
  );
}
