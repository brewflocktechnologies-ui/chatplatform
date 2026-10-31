import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const { query, get } = vi.hoisted(() => ({
  query: vi.fn((_options: { queryKey: readonly unknown[] }) => Promise.resolve()),
  get: vi.fn()
}));

vi.mock('@/lib/query-client', () => ({
  getQueryClient: () => ({ query })
}));
vi.mock('@/lib/searchparams', () => ({ searchParamsCache: { get } }));
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  dehydrate: () => ({ mutations: [], queries: [] }),
  HydrationBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));
vi.mock('@/features/websites/components/websites-table', () => ({
  WebsitesTable: () => <div>websites-table</div>
}));

import WebsiteListingPage from '@/features/websites/components/website-listing';

function params(values: Record<string, unknown>) {
  get.mockImplementation((key: string) => values[key]);
}

beforeEach(() => vi.clearAllMocks());

describe('WebsiteListingPage', () => {
  it('prefetches with only the provided filters', () => {
    params({ page: 1, perPage: 10 });
    render(<WebsiteListingPage />);

    expect(screen.getByText('websites-table')).toBeInTheDocument();
    expect(query.mock.calls[0][0].queryKey).toEqual(['websites', 'list', { page: 1, limit: 10 }]);
  });

  it('includes search, category and sort when present', () => {
    params({ page: 3, perPage: 5, name: 'ex', category: 'Saas', sort: '[]' });
    render(<WebsiteListingPage />);

    expect(query.mock.calls[0][0].queryKey[2]).toEqual({
      page: 3,
      limit: 5,
      search: 'ex',
      category: 'Saas',
      sort: '[]'
    });
  });
});
