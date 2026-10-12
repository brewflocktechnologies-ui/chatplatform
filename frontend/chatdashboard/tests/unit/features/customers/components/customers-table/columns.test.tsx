import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ColumnDef } from '@tanstack/react-table';

vi.mock('@/features/customers/components/customers-table/cell-action', () => ({
  CellAction: ({ data }: { data: { id: string } }) => <div data-testid='cell-action'>{data.id}</div>
}));
vi.mock('@/components/ui/table/data-table-column-header', () => ({
  DataTableColumnHeader: ({ title }: { title: string }) => <span>{title}</span>
}));

import { columns } from '@/features/customers/components/customers-table/columns';
import type { Customer } from '@/features/customers/api/types';

afterEach(cleanup);

const row: Customer = {
  id: 'c1',
  name: 'Acme',
  email: 'team@acme.com',
  country: 'india',
  dateAdded: '2026-01-02T12:00:00Z',
  integrations: '{"crm":"yes","analytics":"yes"}',
  activePlanName: 'Basic',
  status: 'active'
};

const col = (key: string) =>
  columns.find((c) => c.id === key || (c as { accessorKey?: string }).accessorKey === key)!;

function renderCell(key: string, data: Customer = row) {
  const c = col(key) as ColumnDef<Customer> & { accessorKey: keyof Customer };
  const value = data[c.accessorKey];
  const node = (c.cell as (ctx: unknown) => React.ReactNode)({
    row: { original: data },
    cell: { getValue: () => value }
  });
  return render(<>{node}</>);
}

function renderHeader(key: string) {
  const header = col(key).header as unknown;
  if (typeof header === 'string') return render(<>{header}</>);
  return render(<>{(header as (ctx: unknown) => React.ReactNode)({ column: {} })}</>);
}

describe('customers columns', () => {
  it.each([
    ['name', 'Name'],
    ['email', 'EMAIL'],
    ['country', 'COUNTRY'],
    ['dateAdded', 'Date Added'],
    ['integrations', 'INTEGRATIONS'],
    ['activePlanName', 'Active Plan'],
    ['status', 'Status'],
    ['actions', 'ACTIONS']
  ])('renders the %s header', (key, text) => {
    renderHeader(key);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('renders name, country and plan cells', () => {
    renderCell('name');
    expect(screen.getByText('Acme')).toHaveClass('font-medium');
    cleanup();
    renderCell('country');
    expect(screen.getByText('india')).toHaveClass('capitalize');
    cleanup();
    renderCell('activePlanName');
    expect(screen.getByText('Basic')).toBeInTheDocument();
  });

  it('formats the date, falling back for missing or invalid values', () => {
    renderCell('dateAdded');
    expect(screen.getByText('Jan 2, 2026')).toBeInTheDocument();
    cleanup();
    renderCell('dateAdded', { ...row, dateAdded: '' });
    expect(screen.getByText('—')).toBeInTheDocument();
    cleanup();
    renderCell('dateAdded', { ...row, dateAdded: 'not-a-date' });
    expect(screen.getByText('not-a-date')).toBeInTheDocument();
  });

  it('lists active integrations as badges, or None', () => {
    renderCell('integrations');
    expect(screen.getByText('crm')).toBeInTheDocument();
    expect(screen.getByText('analytics')).toBeInTheDocument();
    cleanup();
    renderCell('integrations', { ...row, integrations: '{"crm":"yes","analytics":"no"}' });
    expect(screen.getByText('crm')).toBeInTheDocument();
    expect(screen.queryByText('analytics')).not.toBeInTheDocument();
    cleanup();
    renderCell('integrations', { ...row, integrations: '{"crm":"no","analytics":"no"}' });
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('renders the status badge for active and inactive customers', () => {
    renderCell('status');
    expect(screen.getByText('active')).toBeInTheDocument();
    cleanup();
    renderCell('status', { ...row, status: 'inactive' });
    expect(screen.getByText('inactive')).toBeInTheDocument();
  });

  it('renders the row actions', () => {
    renderCell('actions');
    expect(screen.getByTestId('cell-action')).toHaveTextContent('c1');
  });
});
