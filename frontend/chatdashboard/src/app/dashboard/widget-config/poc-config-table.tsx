'use client';

import { format } from 'date-fns';
import type { Column, ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { useDataTable } from '@/hooks/use-data-table';
import type { PocConfig } from '@/features/poc-config/api/types';
import { PocConfigCellAction } from '@/features/poc-config/components/poc-config-cell-action';

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : format(date, 'MMM d, yyyy HH:mm');
}

// Column ids double as the API sort fields (see POC_CONFIG_SORT_FIELDS).
const columns: ColumnDef<PocConfig>[] = [
  {
    id: 'configName',
    accessorKey: 'configName',
    header: ({ column }: { column: Column<PocConfig, unknown> }) => (
      <DataTableColumnHeader column={column} title='Config' />
    ),
    cell: ({ cell }) => <span className='font-medium'>{cell.getValue<string>()}</span>
  },
  {
    id: 'clientName',
    accessorKey: 'clientName',
    header: ({ column }: { column: Column<PocConfig, unknown> }) => (
      <DataTableColumnHeader column={column} title='Client' />
    ),
    cell: ({ row }) => (
      <div className='flex flex-col'>
        <span>{row.original.clientName}</span>
        <span className='text-muted-foreground text-xs'>{row.original.clientId}</span>
      </div>
    )
  },
  {
    id: 'website',
    accessorKey: 'websiteLink',
    enableSorting: false,
    header: 'WEBSITE',
    cell: ({ row }) => (
      <div className='flex flex-col'>
        <span>{row.original.websiteLink ?? '—'}</span>
        <span className='text-muted-foreground text-xs'>{row.original.websiteId}</span>
      </div>
    )
  },
  {
    accessorKey: 'tenantId',
    enableSorting: false,
    header: 'TENANT ID'
  },
  {
    id: 'updatedAt',
    accessorKey: 'updatedAt',
    header: ({ column }: { column: Column<PocConfig, unknown> }) => (
      <DataTableColumnHeader column={column} title='Updated' />
    ),
    cell: ({ cell }) => formatDate(cell.getValue<string | null>())
  },
  {
    id: 'actions',
    cell: ({ row }) => <PocConfigCellAction data={row.original} />
  }
];

/** Paging and sorting live in the URL; the server page re-fetches when they change. */
export function PocConfigTable({
  configs,
  pageCount
}: {
  configs: PocConfig[];
  pageCount: number;
}) {
  const { table } = useDataTable({
    data: configs,
    columns,
    pageCount,
    shallow: false
  });

  return <DataTable table={table} />;
}
