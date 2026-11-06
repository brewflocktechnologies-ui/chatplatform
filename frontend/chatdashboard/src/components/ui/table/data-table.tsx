import { type Table as TanstackTable, flexRender } from '@tanstack/react-table';
import type * as React from 'react';

import { DataTablePagination } from '@/components/ui/table/data-table-pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { getCommonPinningStyles } from '@/lib/data-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface DataTableProps<TData> extends React.ComponentProps<'div'> {
  readonly table: TanstackTable<TData>;
  readonly actionBar?: React.ReactNode;
  /** Never squeeze columns below their `size`; scroll horizontally instead. */
  readonly minTableWidth?: boolean;
  /** Nothing loaded yet: show placeholder rows instead of "No results.". */
  readonly isLoading?: boolean;
  /** The last load failed; with no rows to show, offers a retry. */
  readonly isError?: boolean;
  readonly onRetry?: () => void;
  /** Rows are on screen while a newer copy loads behind them. */
  readonly isRefreshing?: boolean;
}

export function DataTable<TData>({
  table,
  actionBar,
  minTableWidth,
  isLoading,
  isError,
  onRetry,
  isRefreshing,
  children
}: Readonly<DataTableProps<TData>>) {
  const hasRows = table.getRowModel().rows.length > 0;
  const columnCount = table.getAllColumns().length;

  const renderTableBody = () => {
    if (table.getRowModel().rows?.length) {
      return table.getRowModel().rows.map((row) => (
        <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
          {row.getVisibleCells().map((cell) => (
            <TableCell
              key={cell.id}
              style={{
                ...getCommonPinningStyles({ column: cell.column })
              }}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          ))}
        </TableRow>
      ));
    }

    if (isLoading) {
      return Array.from({ length: 6 }, (_, i) => (
        <TableRow key={i} data-slot='loading-row'>
          {Array.from({ length: columnCount }, (_, j) => (
            <TableCell key={j}>
              <Skeleton className='h-4 w-full max-w-40' />
            </TableCell>
          ))}
        </TableRow>
      ));
    }

    if (isError) {
      return (
        <TableRow>
          <TableCell colSpan={columnCount} className='h-24 text-center'>
            <div className='flex flex-col items-center gap-2'>
              <span className='text-muted-foreground'>Couldn&apos;t load data.</span>
              {onRetry && (
                <Button type='button' variant='outline' size='sm' onClick={onRetry}>
                  Retry
                </Button>
              )}
            </div>
          </TableCell>
        </TableRow>
      );
    }

    return (
      <TableRow>
        <TableCell colSpan={columnCount} className='h-24 text-center'>
          No results.
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className='flex flex-1 flex-col space-y-4' aria-busy={isLoading || isRefreshing}>
      {children}
      {isError && hasRows && (
        <div
          role='alert'
          className='text-muted-foreground flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm'
        >
          <span>Couldn&apos;t refresh. Showing the last loaded data.</span>
          {onRetry && (
            <Button type='button' variant='outline' size='sm' onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      )}
      <div className='relative flex flex-1'>
        <div className='absolute inset-0 flex overflow-hidden rounded-lg border'>
          {isRefreshing && (
            <output
              aria-label='Refreshing'
              className='bg-primary/60 absolute inset-x-0 top-0 z-20 block h-0.5 animate-pulse'
            />
          )}
          {/* The Table wrapper scrolls horizontally, which would make it the sticky
              header's scroll container; let the ScrollArea own both axes instead. */}
          <ScrollArea className='h-full w-full [&_[data-slot=table-container]]:overflow-visible'>
            <Table style={minTableWidth ? { minWidth: table.getTotalSize() } : undefined}>
              <TableHeader className='bg-muted sticky top-0 z-10'>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        colSpan={header.colSpan}
                        style={{
                          ...getCommonPinningStyles({ column: header.column })
                        }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              {/* Keep the divider under the last row — the scroll container is
                  usually taller than the rows, so the table shouldn't end
                  without a line. */}
              <TableBody className='[&_tr:last-child]:border-b'>
                {renderTableBody()}
              </TableBody>
            </Table>
            <ScrollBar orientation='horizontal' />
          </ScrollArea>
        </div>
      </div>
      <div className='flex flex-col gap-2.5'>
        <DataTablePagination table={table} />
        {actionBar && table.getFilteredSelectedRowModel().rows.length > 0 && actionBar}
      </div>
    </div>
  );
}
