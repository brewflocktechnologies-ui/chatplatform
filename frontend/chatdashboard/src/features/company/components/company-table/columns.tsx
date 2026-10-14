'use client';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Icons } from '@/components/icons';
import type { Column, ColumnDef } from '@tanstack/react-table';
import type { Company } from '../../api/types';
import { CellAction } from './cell-action';

const dash = <span className='text-muted-foreground'>—</span>;

const sortableHeader =
  (title: string) =>
  ({ column }: { column: Column<Company, unknown> }) => (
    <DataTableColumnHeader column={column} title={title} />
  );

export const columns: ColumnDef<Company>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    header: sortableHeader('Name'),
    cell: ({ row }) => <span className='font-medium'>{row.original.name}</span>,
    meta: {
      label: 'Name',
      placeholder: 'Search companies...',
      variant: 'text' as const,
      icon: Icons.text
    },
    enableColumnFilter: true
  },
  {
    id: 'email',
    header: sortableHeader('Email'),
    cell: ({ row }) => row.original.companyDetails?.contactEmail ?? dash
  },
  {
    id: 'industry',
    header: sortableHeader('Industry'),
    cell: ({ row }) => row.original.companyDetails?.industry ?? dash
  },
  {
    id: 'headquarters',
    header: sortableHeader('Headquarters'),
    cell: ({ row }) => {
      const hq = row.original.headquarters;
      return [hq?.city, hq?.country].filter(Boolean).join(', ') || dash;
    }
  },
  {
    id: 'employees',
    header: sortableHeader('Employees'),
    cell: ({ row }) => row.original.companyDetails?.employeeCount?.toLocaleString() ?? dash
  },
  {
    id: 'plans',
    header: 'PLANS',
    enableSorting: false,
    cell: ({ row }) => <Badge variant='outline'>{row.original.customPlanIds.length}</Badge>
  },
  {
    id: 'customers',
    header: 'CUSTOMERS',
    enableSorting: false,
    cell: ({ row }) => <Badge variant='outline'>{row.original.customerIds.length}</Badge>
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
