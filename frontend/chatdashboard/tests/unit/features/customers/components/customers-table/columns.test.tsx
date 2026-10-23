import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('@/components/ui/table/data-table-column-header', () => ({
  DataTableColumnHeader: ({ title }: { title: string }) => <span>{title}</span>
}));

import { columns } from '@/features/customers/components/customers-table/columns';
import type { Customer } from '@/features/customers/api/types';

afterEach(cleanup);

const row: Customer = {
  id: 53,
  externalId: 'cust-aadhi-98765',
  email: 'aadhi@example.com',
  activePlan: { id: 2, name: 'Premium' },
  billingAddress: {
    line1: '456 Oak Avenue',
    line2: 'Suite 200',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94105',
    country: 'USA'
  },
  creditCard: { brand: 'MasterCard', numberLastFourDigits: '5678' },
  invoices: []
};

const bare: Customer = {
  ...row,
  activePlan: null,
  billingAddress: null,
  creditCard: null
};

const col = (id: string) => columns.find((c) => c.id === id)!;

function renderCell(id: string, data: Customer = row) {
  const node = (col(id).cell as (ctx: unknown) => React.ReactNode)({ row: { original: data } });
  return render(<>{node}</>);
}

function renderHeader(id: string) {
  const header = col(id).header as (ctx: unknown) => React.ReactNode;
  return render(<>{header({ column: {} })}</>);
}

describe('customers columns', () => {
  it.each([
    ['email', 'Email'],
    ['externalId', 'External ID'],
    ['city', 'City'],
    ['state', 'State'],
    ['country', 'Country'],
    ['card', 'Card'],
    ['activePlan', 'Active Plan'],
    ['invoices', 'Invoices']
  ])('renders the %s header', (id, text) => {
    renderHeader(id);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('makes email the searchable column', () => {
    expect(col('email').enableColumnFilter).toBe(true);
    expect(col('email').meta).toMatchObject({ variant: 'text' });
  });

  it('only leaves plan and invoices unsortable', () => {
    expect(columns.filter((c) => c.enableSorting === false).map((c) => c.id)).toEqual([
      'activePlan',
      'invoices'
    ]);
  });

  it('renders email and external id', () => {
    renderCell('email');
    expect(screen.getByText('aadhi@example.com')).toHaveClass('font-medium');
    cleanup();
    renderCell('externalId');
    expect(screen.getByText('cust-aadhi-98765')).toBeInTheDocument();
  });

  it('renders address cells, with a dash when there is no address', () => {
    for (const [id, text] of [
      ['city', 'San Francisco'],
      ['state', 'CA'],
      ['country', 'USA']
    ]) {
      renderCell(id);
      expect(screen.getByText(text)).toBeInTheDocument();
      cleanup();
      renderCell(id, bare);
      expect(screen.getByText('—')).toBeInTheDocument();
      cleanup();
    }
  });

  it('renders the card brand with its last four digits, or a dash', () => {
    renderCell('card');
    expect(screen.getByText('MasterCard •••• 5678')).toBeInTheDocument();
    cleanup();
    renderCell('card', bare);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders the active plan as a badge, or a dash', () => {
    renderCell('activePlan');
    expect(screen.getByText('Premium')).toBeInTheDocument();
    cleanup();
    renderCell('activePlan', bare);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders the invoice count', () => {
    renderCell('invoices');
    expect(screen.getByText('0')).toBeInTheDocument();
    cleanup();
    renderCell('invoices', {
      ...row,
      invoices: [{ id: 1 }, { id: 2 }] as unknown as Customer['invoices']
    });
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
