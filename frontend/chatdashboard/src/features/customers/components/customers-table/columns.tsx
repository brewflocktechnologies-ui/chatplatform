'use client';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import type { Customer } from '../../api/types';
import { Column, ColumnDef } from '@tanstack/react-table';
import { Icons } from '@/components/icons';
import { parseIntegrations } from '../../lib/integrations';
import { CellAction } from './cell-action';
import { PLAN_OPTIONS, STATUS_OPTIONS } from './options';

function formatDate(value: string | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : format(date, 'MMM d, yyyy');
}

export const columns: ColumnDef<Customer>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    header: ({ column }: { column: Column<Customer, unknown> }) => (
      <DataTableColumnHeader column={column} title='Name' />
    ),
    cell: ({ row }) => <span className='font-medium'>{row.original.name}</span>,
    meta: {
      label: 'Name',
      placeholder: 'Search customers...',
      variant: 'text' as const,
      icon: Icons.text
    },
    enableColumnFilter: true
  },
  {
    accessorKey: 'email',
    header: 'EMAIL'
  },
  {
    accessorKey: 'country',
    header: 'COUNTRY',
    cell: ({ cell }) => <span className='capitalize'>{cell.getValue<string>()}</span>
  },
  {
    id: 'dateAdded',
    accessorKey: 'dateAdded',
    header: ({ column }: { column: Column<Customer, unknown> }) => (
      <DataTableColumnHeader column={column} title='Date Added' />
    ),
    cell: ({ cell }) => formatDate(cell.getValue<string>())
  },
  {
    accessorKey: 'integrations',
    header: 'INTEGRATIONS',
    cell: ({ cell }) => {
      const flags = parseIntegrations(cell.getValue<string>());
      const active = Object.entries(flags)
        .filter(([, on]) => on)
        .map(([key]) => key);

      if (active.length === 0) {
        return <span className='text-muted-foreground text-sm'>None</span>;
      }
      return (
        <div className='flex gap-1'>
          {active.map((key) => (
            <Badge key={key} variant='outline' className='uppercase'>
              {key}
            </Badge>
          ))}
        </div>
      );
    }
  },
  {
    id: 'activePlanName',
    accessorKey: 'activePlanName',
    enableSorting: false,
    header: ({ column }: { column: Column<Customer, unknown> }) => (
      <DataTableColumnHeader column={column} title='Active Plan' />
    ),
    cell: ({ cell }) => <Badge variant='outline'>{cell.getValue<string>()}</Badge>,
    enableColumnFilter: true,
    meta: {
      label: 'Plan',
      variant: 'multiSelect' as const,
      options: PLAN_OPTIONS
    }
  },
  {
    id: 'status',
    accessorKey: 'status',
    enableSorting: false,
    header: ({ column }: { column: Column<Customer, unknown> }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ cell }) => {
      const status = cell.getValue<string>();
      return (
        <Badge variant={status === 'active' ? 'default' : 'secondary'} className='capitalize'>
          {status}
        </Badge>
      );
    },
    enableColumnFilter: true,
    meta: {
      label: 'Status',
      variant: 'multiSelect' as const,
      options: STATUS_OPTIONS
    }
  },
  {
    id: 'actions',
    header: () => <span className='block text-center'>ACTIONS</span>,
    size: 80,
    cell: ({ row }) => (
      <div className='flex justify-center'>
        <CellAction data={row.original} />
      </div>
    )
  }
];
