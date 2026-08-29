'use client';
import Link from 'next/link';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import type { Website } from '../../api/types';
import { Column, ColumnDef } from '@tanstack/react-table';
import { Icons } from '@/components/icons';
import { CellAction } from './cell-action';
import { CATEGORY_OPTIONS } from './options';

function formatDate(value: string | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : format(date, 'MMM d, yyyy');
}

function BooleanBadge({ value, trueLabel, falseLabel }: { value: boolean; trueLabel: string; falseLabel: string }) {
  return (
    <Badge variant={value ? 'default' : 'secondary'}>
      {value ? (
        <Icons.check className='mr-1 h-3 w-3' />
      ) : (
        <Icons.close className='mr-1 h-3 w-3' />
      )}
      {value ? trueLabel : falseLabel}
    </Badge>
  );
}

export const columns: ColumnDef<Website>[] = [
  {
    id: 'name',
    accessorKey: 'domain',
    header: ({ column }: { column: Column<Website, unknown> }) => (
      <DataTableColumnHeader column={column} title='Domain' />
    ),
    cell: ({ row }) => (
      <div className='flex flex-col'>
        <span className='font-medium'>
          {row.original.protocol.toLowerCase()}://{row.original.domain}
        </span>
        <span className='text-muted-foreground text-xs'>{row.original.customerName}</span>
      </div>
    ),
    meta: {
      label: 'Domain',
      placeholder: 'Search websites...',
      variant: 'text' as const,
      icon: Icons.text
    },
    enableColumnFilter: true
  },
  {
    id: 'category',
    accessorKey: 'businessCategory',
    enableSorting: false,
    header: ({ column }: { column: Column<Website, unknown> }) => (
      <DataTableColumnHeader column={column} title='Category' />
    ),
    cell: ({ cell }) => <Badge variant='outline'>{cell.getValue<string>()}</Badge>,
    enableColumnFilter: true,
    meta: {
      label: 'Category',
      variant: 'multiSelect' as const,
      options: CATEGORY_OPTIONS
    }
  },
  {
    id: 'dateAdded',
    accessorKey: 'dateAdded',
    header: ({ column }: { column: Column<Website, unknown> }) => (
      <DataTableColumnHeader column={column} title='Date Added' />
    ),
    cell: ({ cell }) => formatDate(cell.getValue<string>())
  },
  {
    accessorKey: 'configName',
    header: 'CONFIG',
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
    cell: ({ cell }) => (
      <BooleanBadge value={cell.getValue<boolean>()} trueLabel='Active' falseLabel='Inactive' />
    )
  },
  {
    accessorKey: 'isVerified',
    header: 'VERIFIED',
    cell: ({ cell }) => (
      <BooleanBadge value={cell.getValue<boolean>()} trueLabel='Verified' falseLabel='Unverified' />
    )
  },
  {
    id: 'actions',
    cell: ({ row }) => <CellAction data={row.original} />
  }
];
