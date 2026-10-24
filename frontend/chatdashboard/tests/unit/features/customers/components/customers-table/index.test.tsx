import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { Suspense } from 'react';

vi.mock('@/features/customers/api/service', () => ({
  getCustomers: vi.fn(),
  getAllCustomers: vi.fn()
}));

import { getAllCustomers, getCustomers } from '@/features/customers/api/service';
import {
  CustomersTable,
  CustomersTableSkeleton
} from '@/features/customers/components/customers-table';
import type { Customer } from '@/features/customers/api/types';

afterEach(cleanup);

const customer = (id: number, email: string, city: string | null = null): Customer => ({
  id,
  externalId: `ext-${id}`,
  email,
  activePlan: null,
  billingAddress: city
    ? { line1: null, line2: null, city, state: null, postalCode: null, country: 'USA' }
    : null,
  creditCard: null,
  invoices: []
});

const acme = customer(1, 'team@acme.com', 'Berlin');
const globex = customer(2, 'ops@globex.com', 'Paris');

beforeEach(() => {
  // jsdom lacks the Web Animations API that Base UI's scroll area polls for.
  Element.prototype.getAnimations ??= () => [];
  vi.clearAllMocks();
  vi.mocked(getCustomers).mockResolvedValue({
    content: [acme],
    totalElements: 25,
    totalPages: 3,
    number: 0,
    size: 10
  });
  vi.mocked(getAllCustomers).mockResolvedValue([acme, globex]);
});

function renderTable(searchParams = '') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <NuqsTestingAdapter searchParams={searchParams}>
      <QueryClientProvider client={client}>
        <Suspense fallback={<div>loading</div>}>
          <CustomersTable />
        </Suspense>
      </QueryClientProvider>
    </NuqsTestingAdapter>
  );
}

describe('CustomersTable', () => {
  it('fetches the first page (0-based) and renders rows', async () => {
    renderTable();
    expect(await screen.findByText('team@acme.com')).toBeInTheDocument();
    expect(getCustomers).toHaveBeenCalledWith({ page: 0, size: 10, sort: undefined });
    expect(getAllCustomers).not.toHaveBeenCalled();
    expect(screen.getByText('Berlin')).toBeInTheDocument();
  });

  it('maps url page, size and sort onto the API query', async () => {
    const sort = JSON.stringify([{ id: 'email', desc: true }]);
    renderTable(`?page=2&perPage=20&sort=${encodeURIComponent(sort)}`);
    await screen.findByText('team@acme.com');
    expect(getCustomers).toHaveBeenCalledWith({
      page: 1,
      size: 20,
      sort: { field: 'email', dir: 'desc' }
    });
  });

  it('searches client-side across all customers when a search is set', async () => {
    renderTable('?email=globex');
    expect(await screen.findByText('ops@globex.com')).toBeInTheDocument();
    expect(screen.queryByText('team@acme.com')).not.toBeInTheDocument();
    expect(getAllCustomers).toHaveBeenCalled();
    expect(getCustomers).not.toHaveBeenCalled();
  });
});

describe('CustomersTableSkeleton', () => {
  it('renders placeholder blocks', () => {
    const { container } = render(<CustomersTableSkeleton />);
    expect(container.querySelectorAll('.bg-muted')).toHaveLength(3);
  });
});
