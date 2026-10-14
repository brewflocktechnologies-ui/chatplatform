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
    size: 240,
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
    size: 260,
    header: sortableHeader('Email'),
    cell: ({ row }) => row.original.companyDetails?.contactEmail ?? dash
  },
  {
    id: 'phone',
    size: 150,
    header: sortableHeader('Phone'),
    cell: ({ row }) => row.original.companyDetails?.contactPhone ?? dash
  },
  {
    id: 'industry',
    size: 150,
    header: sortableHeader('Industry'),
    cell: ({ row }) => row.original.companyDetails?.industry ?? dash
  },
  {
    id: 'city',
    size: 130,
    header: sortableHeader('City'),
    cell: ({ row }) => row.original.headquarters?.city ?? dash
  },
  {
    id: 'state',
    size: 140,
    header: sortableHeader('State'),
    cell: ({ row }) => row.original.headquarters?.state ?? dash
  },
  {
    id: 'country',
    size: 130,
    header: sortableHeader('Country'),
    cell: ({ row }) => row.original.headquarters?.country ?? dash
  },
  {
    id: 'pinCode',
    size: 110,
    header: sortableHeader('Pin Code'),
    meta: { label: 'Pin Code' },
    cell: ({ row }) => row.original.headquarters?.postalCode ?? dash
  },
  {
    id: 'employees',
    size: 130,
    header: sortableHeader('Employees'),
    cell: ({ row }) => row.original.companyDetails?.employeeCount?.toLocaleString() ?? dash
  },
  {
    id: 'plans',
    size: 100,
    header: 'Plans',
    enableSorting: false,
    cell: ({ row }) => <Badge variant='outline'>{row.original.customPlanIds.length}</Badge>
  },
  {
    id: 'customers',
    size: 120,
    header: 'Customers',
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
