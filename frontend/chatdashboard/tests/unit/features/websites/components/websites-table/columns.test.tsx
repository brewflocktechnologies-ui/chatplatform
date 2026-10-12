import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ColumnDef } from '@tanstack/react-table';

vi.mock('@/features/websites/components/websites-table/cell-action', () => ({
  CellAction: ({ data }: { data: { id: string } }) => <div data-testid='cell-action'>{data.id}</div>
}));
vi.mock('@/components/ui/table/data-table-column-header', () => ({
  DataTableColumnHeader: ({ title }: { title: string }) => <span>{title}</span>
}));

import { columns } from '@/features/websites/components/websites-table/columns';
import {
  CATEGORY_OPTIONS,
  PROTOCOL_OPTIONS
} from '@/features/websites/components/websites-table/options';
import type { Website } from '@/features/websites/api/types';

afterEach(cleanup);

const row: Website = {
  id: 'w1',
  protocol: 'HTTPS',
  domain: 'example.com',
  companyId: 'co1',
  customerId: 'c1',
  customerName: 'Acme',
  flavour: 'Orange',
  businessCategory: 'Saas',
  dateAdded: '2026-01-02T12:00:00Z',
  isActive: true,
  isVerified: false
};

const col = (key: string) =>
  columns.find((c) => c.id === key || (c as { accessorKey?: string }).accessorKey === key)!;

function renderCell(key: string, data: Website = row) {
  const c = col(key) as ColumnDef<Website> & { accessorKey: keyof Website };
  const node = (c.cell as (ctx: unknown) => React.ReactNode)({
    row: { original: data },
    cell: { getValue: () => data[c.accessorKey] }
  });
  return render(<>{node}</>);
}

function renderHeader(key: string) {
  const header = col(key).header as unknown;
  if (typeof header === 'string') return render(<>{header}</>);
  return render(<>{(header as (ctx: unknown) => React.ReactNode)({ column: {} })}</>);
}

describe('websites columns', () => {
  it.each([
    ['name', 'Domain'],
    ['category', 'Category'],
    ['dateAdded', 'Date Added'],
    ['configName', 'CONFIG'],
    ['isActive', 'ACTIVE'],
    ['isVerified', 'VERIFIED'],
    ['actions', 'ACTIONS']
  ])('renders the %s header', (key, text) => {
    renderHeader(key);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('renders the domain with a lowercased protocol and the customer name', () => {
    renderCell('name');
    expect(screen.getByText('https://example.com')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
  });

  it('renders the category badge and the formatted date', () => {
    renderCell('category');
    expect(screen.getByText('Saas')).toBeInTheDocument();
    cleanup();
    renderCell('dateAdded');
    expect(screen.getByText('Jan 2, 2026')).toBeInTheDocument();
    cleanup();
    renderCell('dateAdded', { ...row, dateAdded: '' });
    expect(screen.getByText('—')).toBeInTheDocument();
    cleanup();
    renderCell('dateAdded', { ...row, dateAdded: 'garbage' });
    expect(screen.getByText('garbage')).toBeInTheDocument();
  });

  it('links the config badge to the widget modifier with ids', () => {
    renderCell('configName', { ...row, configName: 'Brand', configId: 'cfg1' });
    const link = screen.getByRole('link');
    expect(screen.getByText('Brand')).toBeInTheDocument();
    const url = new URL(link.getAttribute('href')!, 'http://x');
    expect(url.pathname).toBe('/dashboard/widget-modifier');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      customerId: 'c1',
      websiteId: 'w1',
      configId: 'cfg1'
    });
  });

  it('falls back to the flavour, companyId and omits configId when absent', () => {
    renderCell('configName', { ...row, customerId: '' });
    expect(screen.getByText('Orange')).toBeInTheDocument();
    const url = new URL(screen.getByRole('link').getAttribute('href')!, 'http://x');
    expect(Object.fromEntries(url.searchParams)).toEqual({ customerId: 'co1', websiteId: 'w1' });
  });

  it('shows None when there is no config or flavour, with an empty customer id', () => {
    renderCell('configName', { ...row, flavour: '', customerId: '', companyId: '' });
    expect(screen.getByText('None')).toBeInTheDocument();
    const url = new URL(screen.getByRole('link').getAttribute('href')!, 'http://x');
    expect(url.searchParams.get('customerId')).toBe('');
  });

  it('renders the boolean badges', () => {
    renderCell('isActive');
    expect(screen.getByText('Active')).toBeInTheDocument();
    cleanup();
    renderCell('isActive', { ...row, isActive: false });
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    cleanup();
    renderCell('isVerified', { ...row, isVerified: true });
    expect(screen.getByText('Verified')).toBeInTheDocument();
    cleanup();
    renderCell('isVerified');
    expect(screen.getByText('Unverified')).toBeInTheDocument();
  });

  it('renders the row actions', () => {
    renderCell('actions');
    expect(screen.getByTestId('cell-action')).toHaveTextContent('w1');
  });

  it('exposes protocol and category options', () => {
    expect(PROTOCOL_OPTIONS.map((o) => o.value)).toEqual(['HTTPS', 'HTTP']);
    expect(CATEGORY_OPTIONS).toHaveLength(5);
  });
});
