import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/table/data-table';

vi.mock('@/components/ui/table/data-table-pagination', () => ({
  DataTablePagination: () => null
}));

type Row = { name: string };
const columns: ColumnDef<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name' },
  { id: 'other', accessorKey: 'name', header: 'Other' }
];

function Harness({
  rows,
  ...props
}: { rows: Row[] } & Omit<React.ComponentProps<typeof DataTable<Row>>, 'table'>) {
  // Test harness only; the app's tables go through useDataTable.
  // oxlint-disable-next-line react/incompatible-library
  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });
  return <DataTable table={table} {...props} />;
}

afterEach(cleanup);

describe('DataTable states', () => {
  it('shows "No results." for an empty, settled table', () => {
    render(<Harness rows={[]} />);
    expect(screen.getByText('No results.')).toBeInTheDocument();
  });

  it('shows placeholder rows, not "No results.", while nothing has loaded', () => {
    const { container } = render(<Harness rows={[]} isLoading />);
    expect(screen.queryByText('No results.')).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot=loading-row]')).toHaveLength(6);
    expect(container.firstChild).toHaveAttribute('aria-busy', 'true');
  });

  it('offers a retry when the load failed and there are no rows', () => {
    const onRetry = vi.fn();
    render(<Harness rows={[]} isError onRetry={onRetry} />);

    expect(screen.getByText("Couldn't load data.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('keeps stale rows and warns when a refresh fails', () => {
    const onRetry = vi.fn();
    render(<Harness rows={[{ name: 'Acme' }]} isError onRetry={onRetry} />);

    expect(screen.getAllByText('Acme').length).toBeGreaterThan(0);
    expect(screen.getByRole('alert')).toHaveTextContent('Showing the last loaded data');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('marks a background refresh without hiding the rows', () => {
    render(<Harness rows={[{ name: 'Acme' }]} isRefreshing />);

    expect(screen.getByRole('status', { name: 'Refreshing' })).toBeInTheDocument();
    expect(screen.getAllByText('Acme').length).toBeGreaterThan(0);
  });

  it('shows no refresh marker when idle', () => {
    render(<Harness rows={[{ name: 'Acme' }]} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
