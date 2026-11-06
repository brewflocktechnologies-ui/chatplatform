'use client';

import type { Column, ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { useDataTable } from '@/hooks/use-data-table';
import type { PocWebsite } from '@/features/poc-website/api/types';
import {
  BooleanBadge,
  WebsiteConfigLink,
  formatWebsiteDate
} from '@/features/websites/components/website-cells';
import { PocWebsiteCellAction } from '@/features/poc-website/components/poc-website-cell-action';

export type { PocWebsite };

// Same columns as the Websites tab; row actions edit or delete through the POC API.
const columns: ColumnDef<PocWebsite>[] = [
  {
    id: 'domain',
    accessorKey: 'domain',
    header: ({ column }: { column: Column<PocWebsite, unknown> }) => (
      <DataTableColumnHeader column={column} title='Domain' />
    ),
    cell: ({ row }) => (
      <div className='flex flex-col'>
        <span className='font-medium'>
          {row.original.protocol.toLowerCase()}://{row.original.domain}
        </span>
        <span className='text-muted-foreground text-xs'>{row.original.customerName}</span>
      </div>
    )
  },
  {
    id: 'category',
    accessorKey: 'businessCategory',
    enableSorting: false,
    header: ({ column }: { column: Column<PocWebsite, unknown> }) => (
      <DataTableColumnHeader column={column} title='Category' />
    ),
    cell: ({ cell }) => <Badge variant='outline'>{cell.getValue<string>()}</Badge>
  },
  {
    id: 'dateAdded',
    accessorKey: 'dateAdded',
    header: ({ column }: { column: Column<PocWebsite, unknown> }) => (
      <DataTableColumnHeader column={column} title='Date Added' />
    ),
    cell: ({ cell }) => formatWebsiteDate(cell.getValue<string | null>())
  },
  {
    accessorKey: 'configName',
    header: 'CONFIG',
    enableSorting: false,
    cell: ({ row }) => <WebsiteConfigLink site={row.original} />
  },
  {
    accessorKey: 'isActive',
    header: 'ACTIVE',
    enableSorting: false,
    cell: ({ cell }) => (
      <BooleanBadge value={cell.getValue<boolean>()} trueLabel='Active' falseLabel='Inactive' />
    )
  },
  {
    accessorKey: 'isVerified',
    header: 'VERIFIED',
    enableSorting: false,
    cell: ({ cell }) => (
      <BooleanBadge value={cell.getValue<boolean>()} trueLabel='Verified' falseLabel='Unverified' />
    )
  },
  {
    id: 'actions',
    header: () => <span className='sr-only'>Actions</span>,
    cell: ({ row }) => <PocWebsiteCellAction data={row.original} />
  }
];

interface PocWebsiteTableProps {
  readonly websites: PocWebsite[];
  readonly pageCount: number;
}

/** Paging and sorting live in the URL; the server page re-fetches when they change. */
export function PocWebsiteTable({ websites, pageCount }: Readonly<PocWebsiteTableProps>) {
  const { table } = useDataTable({
    data: websites,
    columns,
    pageCount,
    shallow: false
  });

  return <DataTable table={table} />;
}
