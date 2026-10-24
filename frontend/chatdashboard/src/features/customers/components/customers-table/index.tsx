'use client';

import { useMemo } from 'react';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { useQuery } from '@tanstack/react-query';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { Icons } from '@/components/icons';
import { getSortingStateParser } from '@/lib/parsers';
import { allCustomersQueryOptions, customersQueryOptions } from '../../api/queries';
import { matchesSearch } from '../../lib/customer-search';
import { parseSortParam } from '../../lib/customer-sort';
import { CustomerFormSheetTrigger } from '../customer-form-sheet';
import { columns } from './columns';

const columnIds = columns.map((c) => c.id).filter(Boolean) as string[];

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

  // Without a search the API pages and sorts for us (the URL is 1-based, the API 0-based).
  // useQuery (not useSuspenseQuery): getCustomers is a server action, and invoking it
  // during render when the filters change makes Next update the Router mid-render.
  const paged = useQuery({
    ...customersQueryOptions({ page: params.page - 1, size: params.perPage, sort }),
    enabled: !search
  });
  // The API can't search, so a search loads everything once and filters it here.
  const all = useQuery({ ...allCustomersQueryOptions(sort), enabled: !!search });

  const { rows, pageCount } = useMemo(() => {
    if (!search) {
      return { rows: paged.data?.content ?? [], pageCount: paged.data?.totalPages ?? 0 };
    }
    const matches = (all.data ?? []).filter((c) => matchesSearch(c, search));
    const start = (params.page - 1) * params.perPage;
    return {
      rows: matches.slice(start, start + params.perPage),
      pageCount: Math.ceil(matches.length / params.perPage)
    };
  }, [search, paged.data, all.data, params.page, params.perPage]);

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
    <DataTable table={table} minTableWidth>
      <DataTableToolbar table={table} actions={<CustomerFormSheetTrigger />}>
        {search && all.isFetching && !all.data && (
          <span className='text-muted-foreground flex items-center gap-2 text-sm' role='status'>
            <Icons.spinner className='h-4 w-4 animate-spin' />
            Searching all customers…
          </span>
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
