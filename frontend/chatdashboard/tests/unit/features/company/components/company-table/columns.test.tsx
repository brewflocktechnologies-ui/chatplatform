import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ColumnDef } from '@tanstack/react-table';

vi.mock('@/features/company/components/company-table/cell-action', () => ({
  CellAction: ({ data }: { data: { id: number } }) => (
    <div data-testid='cell-action'>{data.id}</div>
  )
}));
vi.mock('@/components/ui/table/data-table-column-header', () => ({
  DataTableColumnHeader: ({ title }: { title: string }) => <span>{title}</span>
}));

import { columns } from '@/features/company/components/company-table/columns';
import type { Company } from '@/features/company/api/types';
import { makeCompany } from '../../fixtures';

afterEach(cleanup);

const col = (id: string) => columns.find((c) => c.id === id)! as ColumnDef<Company>;

function renderCell(id: string, data: Company = makeCompany()) {
  const node = (col(id).cell as (ctx: unknown) => React.ReactNode)({ row: { original: data } });
  return render(<>{node}</>);
}

function renderHeader(id: string) {
  const header = col(id).header as (ctx: unknown) => React.ReactNode;
  return render(<>{header({ column: {} })}</>);
}

describe('company columns', () => {
  it('defines the expected column ids', () => {
    expect(columns.map((c) => c.id)).toEqual([
      'name',
      'email',
      'phone',
      'industry',
      'city',
      'state',
      'country',
      'pinCode',
      'employees',
      'plans',
      'customers',
      'actions'
    ]);
  });

  it('marks name as the text-filter column', () => {
    expect(col('name').enableColumnFilter).toBe(true);
    expect(col('name').meta).toMatchObject({ variant: 'text', label: 'Name' });
  });

  it.each([
    ['name', 'Acme Corp'],
    ['email', 'hello@acme.com'],
    ['phone', '+91-9123456780'],
    ['industry', 'Fintech'],
    ['city', 'Bengaluru'],
    ['state', 'Karnataka'],
    ['country', 'India'],
    ['pinCode', '560001']
  ])('renders %s', (id, text) => {
    renderCell(id);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('formats the employee count with separators', () => {
    renderCell('employees', makeCompany({ companyDetails: { ...makeCompany().companyDetails!, employeeCount: 12345 } }));
    expect(screen.getByText((12345).toLocaleString())).toBeInTheDocument();
  });

  it.each(['email', 'phone', 'industry', 'city', 'state', 'country', 'pinCode', 'employees'])(
    'shows a dash for a missing %s',
    (id) => {
      renderCell(id, makeCompany({ companyDetails: null, headquarters: null }));
      expect(screen.getByText('—')).toBeInTheDocument();
    }
  );

  it('shows plan and customer counts', () => {
    renderCell('plans');
    expect(screen.getByText('2')).toBeInTheDocument();
    cleanup();
    renderCell('customers');
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders sortable headers with their titles', () => {
    renderHeader('name');
    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('disables sorting on the count and action columns', () => {
    expect(col('plans').enableSorting).toBe(false);
    expect(col('customers').enableSorting).toBe(false);
    expect(col('actions').enableHiding).toBe(false);
    expect(col('plans').header).toBe('Plans');
    expect(col('customers').header).toBe('Customers');
  });

  it('renders the row actions', () => {
    renderCell('actions', makeCompany({ id: 42 }));
    expect(screen.getByTestId('cell-action')).toHaveTextContent('42');
    cleanup();
    renderHeader('actions');
    expect(screen.getByText('ACTIONS')).toBeInTheDocument();
  });
});
