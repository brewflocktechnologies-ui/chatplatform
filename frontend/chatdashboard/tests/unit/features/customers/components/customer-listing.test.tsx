import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const { prefetchQuery, get } = vi.hoisted(() => ({
  prefetchQuery: vi.fn(),
  get: vi.fn()
}));

vi.mock('@/lib/query-client', () => ({
  getQueryClient: () => ({ prefetchQuery })
}));
vi.mock('@/lib/searchparams', () => ({ searchParamsCache: { get } }));
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  dehydrate: () => ({ mutations: [], queries: [] }),
  HydrationBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));
vi.mock('@/features/customers/components/customers-table', () => ({
  CustomersTable: () => <div>customers-table</div>
}));

import CustomerListingPage from '@/features/customers/components/customer-listing';

function params(values: Record<string, unknown>) {
  get.mockImplementation((key: string) => values[key]);
}

beforeEach(() => vi.clearAllMocks());

describe('CustomerListingPage', () => {
  it('prefetches with only the provided filters', () => {
    params({ page: 1, perPage: 10 });
    render(<CustomerListingPage />);

    expect(screen.getByText('customers-table')).toBeInTheDocument();
    expect(prefetchQuery).toHaveBeenCalledTimes(1);
    expect(prefetchQuery.mock.calls[0][0].queryKey).toEqual([
      'customers',
      'list',
      { page: 1, limit: 10 }
    ]);
  });

  it('includes search, status, plan and sort when present', () => {
    params({
      page: 2,
      perPage: 20,
      name: 'ac',
      status: 'active',
      plan: 'Basic',
      sort: '[]'
    });
    render(<CustomerListingPage />);

    expect(prefetchQuery.mock.calls[0][0].queryKey[2]).toEqual({
      page: 2,
      limit: 20,
      search: 'ac',
      status: 'active',
      plan: 'Basic',
      sort: '[]'
    });
  });
});
