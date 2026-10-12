import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { Suspense } from 'react';

vi.mock('@/features/customers/api/service', () => ({
  getCustomers: vi.fn(),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  deleteCustomer: vi.fn()
}));
vi.mock('@/features/customers/components/customers-table/cell-action', () => ({
  CellAction: () => <span>actions</span>
}));

import { getCustomers } from '@/features/customers/api/service';
import {
  CustomersTable,
  CustomersTableSkeleton
} from '@/features/customers/components/customers-table';
import {
  PLAN_OPTIONS,
  STATUS_OPTIONS
} from '@/features/customers/components/customers-table/options';

afterEach(cleanup);
beforeEach(() => {
  // jsdom lacks the Web Animations API that Base UI's scroll area polls for.
  Element.prototype.getAnimations ??= () => [];
  vi.clearAllMocks();
  vi.mocked(getCustomers).mockResolvedValue({
    success: true,
    total_customers: 25,
    customers: [
      {
        id: 'c1',
        name: 'Acme',
        email: 'team@acme.com',
        country: 'india',
        dateAdded: '2026-01-02T12:00:00Z',
        integrations: '{}',
        activePlanName: 'Basic',
        status: 'active'
      }
    ]
  } as never);
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
  it('fetches with default pagination and renders rows', async () => {
    renderTable();
    expect(await screen.findByText('Acme')).toBeInTheDocument();
    expect(getCustomers).toHaveBeenCalledWith({ page: 1, limit: 10 });
    expect(screen.getByText('team@acme.com')).toBeInTheDocument();
  });

  it('maps url params onto the query filters', async () => {
    const sort = JSON.stringify([{ id: 'name', desc: false }]);
    renderTable(
      `?page=2&perPage=20&name=ac&status=active&plan=Basic&sort=${encodeURIComponent(sort)}`
    );
    await screen.findByText('Acme');
    expect(getCustomers).toHaveBeenCalledWith({
      page: 2,
      limit: 20,
      search: 'ac',
      status: 'active',
      plan: 'Basic',
      sort
    });
  });
});

describe('CustomersTableSkeleton', () => {
  it('renders placeholder blocks', () => {
    const { container } = render(<CustomersTableSkeleton />);
    expect(container.querySelectorAll('.bg-muted')).toHaveLength(3);
  });
});

describe('customer options', () => {
  it('exposes plan and status options', () => {
    expect(PLAN_OPTIONS.map((o) => o.value)).toEqual(['Free', 'Basic', 'Premium', 'Enterprise']);
    expect(STATUS_OPTIONS.map((o) => o.value)).toEqual(['active', 'inactive']);
  });
});
