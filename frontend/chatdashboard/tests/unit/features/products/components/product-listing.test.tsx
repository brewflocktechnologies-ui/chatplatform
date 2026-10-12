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
vi.mock('@/features/products/components/product-tables', () => ({
  ProductTable: () => <div>product-table</div>
}));

import ProductListingPage from '@/features/products/components/product-listing';

function params(values: Record<string, unknown>) {
  get.mockImplementation((key: string) => values[key]);
}

beforeEach(() => vi.clearAllMocks());

describe('ProductListingPage', () => {
  it('prefetches with only the provided filters', () => {
    params({ page: 1, perPage: 10 });
    render(<ProductListingPage />);

    expect(screen.getByText('product-table')).toBeInTheDocument();
    expect(prefetchQuery.mock.calls[0][0].queryKey).toEqual([
      'products',
      'list',
      { page: 1, limit: 10 }
    ]);
  });

  it('includes search, categories and sort when present', () => {
    params({ page: 2, perPage: 20, name: 'la', category: 'home', sort: '[]' });
    render(<ProductListingPage />);

    expect(prefetchQuery.mock.calls[0][0].queryKey[2]).toEqual({
      page: 2,
      limit: 20,
      search: 'la',
      categories: 'home',
      sort: '[]'
    });
  });
});
