'use client';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Icons } from '@/components/icons';
import type { Column, ColumnDef } from '@tanstack/react-table';
import type { Customer } from '../../api/types';
import { CellAction } from './cell-action';

const dash = <span className='text-muted-foreground'>—</span>;

const sortableHeader =
  (title: string) =>
  ({ column }: { column: Column<Customer, unknown> }) => (
    <DataTableColumnHeader column={column} title={title} />
  );

export const columns: ColumnDef<Customer>[] = [
  {
    id: 'email',
    size: 280,
    accessorKey: 'email',
    header: sortableHeader('Email'),
    cell: ({ row }) => <span className='font-medium'>{row.original.email}</span>,
    meta: {
      label: 'Email',
      placeholder: 'Search customers...',
      variant: 'text' as const,
      icon: Icons.text
    },
    enableColumnFilter: true
  },
  {
    id: 'externalId',
    size: 240,
    accessorKey: 'externalId',
    header: sortableHeader('External ID'),
    cell: ({ row }) => <span className='font-mono text-xs'>{row.original.externalId}</span>
  },
  {
    id: 'city',
    size: 140,
    header: sortableHeader('City'),
    cell: ({ row }) => row.original.billingAddress?.city || dash
  },
  {
    id: 'state',
    size: 140,
    header: sortableHeader('State'),
    cell: ({ row }) => row.original.billingAddress?.state || dash
  },
  {
    id: 'country',
    size: 140,
    header: sortableHeader('Country'),
    cell: ({ row }) => row.original.billingAddress?.country || dash
  },
  {
    id: 'card',
    size: 190,
    header: sortableHeader('Card'),
    cell: ({ row }) => {
      const card = row.original.creditCard;
      if (!card) return dash;
      return (
        <span>
          {card.brand ?? 'Card'}
          {card.numberLastFourDigits && ` •••• ${card.numberLastFourDigits}`}
        </span>
      );
    }
  },
  {
    id: 'activePlan',
    size: 140,
    enableSorting: false,
    header: sortableHeader('Active Plan'),
    cell: ({ row }) =>
      row.original.activePlan ? (
        <Badge variant='outline'>{row.original.activePlan.name}</Badge>
      ) : (
        dash
      )
  },
  {
    id: 'invoices',
    size: 100,
    enableSorting: false,
    header: sortableHeader('Invoices'),
    cell: ({ row }) => row.original.invoices.length
  },
  {
    id: 'actions',
    enableHiding: false,
    enableSorting: false,
    header: () => <span className='block text-center'>ACTIONS</span>,
    size: 80,
    cell: ({ row }) => (
      <div className='flex justify-center'>
        <CellAction data={row.original} />
      </div>
    )
  }
];
