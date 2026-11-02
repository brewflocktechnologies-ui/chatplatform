'use client';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import type { Website } from '../../api/types';
import { Column, ColumnDef } from '@tanstack/react-table';
import { Icons } from '@/components/icons';
import { CellAction } from './cell-action';
import { BooleanBadge, WebsiteConfigLink, formatWebsiteDate } from '../website-cells';
import { CATEGORY_OPTIONS } from './options';

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
    cell: ({ cell }) => formatWebsiteDate(cell.getValue<string>())
  },
  {
    accessorKey: 'configName',
    header: 'CONFIG',
    cell: ({ row }) => <WebsiteConfigLink site={row.original} />
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
    enableHiding: false,
    header: () => <span className='block text-center'>ACTIONS</span>,
    size: 80,
    cell: ({ row }) => (
      <div className='flex justify-center'>
        <CellAction data={row.original} />
      </div>
    )
  }
];
