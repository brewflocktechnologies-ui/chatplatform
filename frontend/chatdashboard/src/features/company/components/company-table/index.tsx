'use client';

import { useMemo } from 'react';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { useQuery } from '@tanstack/react-query';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { Icons } from '@/components/icons';
import { getSortingStateParser } from '@/lib/parsers';
import { allCompaniesQueryOptions, companiesQueryOptions } from '../../api/queries';
import { parseSortParam } from '../../lib/company-sort';
import { matchesSearch } from '../../lib/company-search';
import { CompanyFormSheetTrigger } from '../company-form-sheet';
import { columns } from './columns';

const columnIds = columns.map((c) => c.id).filter(Boolean) as string[];

const SpinnerIcon = Icons.spinner;

export function CompanyTable() {
  const [params] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(10),
    name: parseAsString,
    sort: getSortingStateParser(columnIds).withDefault([])
  });

  const sort = useMemo(
    () => (params.sort.length > 0 ? parseSortParam(JSON.stringify(params.sort)) : undefined),
    [params.sort]
  );
  const search = params.name?.trim() ?? '';

  // Without a search the API pages and sorts for us (the URL is 1-based, the API 0-based).
  const paged = useQuery({
    ...companiesQueryOptions({ page: params.page - 1, size: params.perPage, sort }),
    enabled: !search
  });
  // The API can't search, so a search loads everything once and filters it here.
  const all = useQuery({ ...allCompaniesQueryOptions(sort), enabled: !!search });

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

  const active = search ? all : paged;

  const { table } = useDataTable({
    data: rows,
    columns,
    pageCount,
    shallow: true,
    debounceMs: 500,
    initialState: {
      columnVisibility: { phone:false, pinCode: false, plans: false, customers: false },
      columnPinning: { right: ['actions'] }
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
      <DataTableToolbar table={table} actions={<CompanyFormSheetTrigger />}>
        {search && all.isFetching && !all.data && (
          <output className='text-muted-foreground flex items-center gap-2 text-sm'>
            <SpinnerIcon className='h-4 w-4 animate-spin' />
            Searching all companies…
          </output>
        )}
      </DataTableToolbar>
    </DataTable>
  );
}
