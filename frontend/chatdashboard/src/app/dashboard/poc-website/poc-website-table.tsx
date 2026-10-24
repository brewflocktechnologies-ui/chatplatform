'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import type { Column, ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { useDataTable } from '@/hooks/use-data-table';
import type { PocWebsite } from '@/features/poc-website/api/types';
import { PocWebsiteCellAction } from '@/features/poc-website/components/poc-website-cell-action';

export type { PocWebsite };

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : format(date, 'MMM d, yyyy');
}

const CheckIcon = Icons.check;
const CloseIcon = Icons.close;

function BooleanBadge({
  value,
  trueLabel,
  falseLabel
}: {
  value: boolean;
  trueLabel: string;
  falseLabel: string;
}) {
  return (
    <Badge variant={value ? 'default' : 'secondary'}>
      {value ? <CheckIcon className='mr-1 h-3 w-3' /> : <CloseIcon className='mr-1 h-3 w-3' />}
      {value ? trueLabel : falseLabel}
    </Badge>
  );
}

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
    cell: ({ cell }) => formatDate(cell.getValue<string | null>())
  },
  {
    accessorKey: 'configName',
    header: 'CONFIG',
    enableSorting: false,
    cell: ({ row }) => {
      const site = row.original;
      const label = site.configName || site.flavour;
      const query = new URLSearchParams({
        customerId: site.customerId || site.companyId || '',
        websiteId: site.id,
        ...(site.configId && { configId: site.configId })
      });
      return (
        <Link
          href={`/dashboard/widget-modifier?${query.toString()}`}
          title='Open in Widget Modifier'
          className='inline-block'
        >
          {label ? (
            <Badge variant='outline' className='hover:bg-accent cursor-pointer'>
              {label}
            </Badge>
          ) : (
            <span className='text-muted-foreground hover:text-foreground text-sm underline-offset-2 hover:underline'>
              None
            </span>
          )}
        </Link>
      );
    }
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
    cell: ({ row }) => <PocWebsiteCellAction data={row.original} />
  }
];

/** Paging and sorting live in the URL; the server page re-fetches when they change. */
export function PocWebsiteTable({
  websites,
  pageCount
}: {
  websites: PocWebsite[];
  pageCount: number;
}) {
  const { table } = useDataTable({
    data: websites,
    columns,
    pageCount,
    shallow: false
  });

  return <DataTable table={table} />;
}
