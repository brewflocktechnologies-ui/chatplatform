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
vi.mock('@/features/company/components/company-table', () => ({
  CompanyTable: () => <div>company-table</div>
}));

import CompanyListing from '@/features/company/components/company-listing';

function params(values: Record<string, unknown>) {
  get.mockImplementation((key: string) => values[key]);
}

beforeEach(() => vi.clearAllMocks());

describe('CompanyListing', () => {
  it('prefetches the 0-based page when there is no search', () => {
    params({ page: 3, perPage: 20, name: null, sort: null });
    render(<CompanyListing />);

    expect(screen.getByText('company-table')).toBeInTheDocument();
    expect(prefetchQuery).toHaveBeenCalledTimes(1);
    expect(prefetchQuery.mock.calls[0][0].queryKey).toEqual([
      'companies',
      'list',
      { page: 2, size: 20, sort: undefined }
    ]);
  });

  it('translates the sort param into an API sort', () => {
    params({ page: 1, perPage: 10, name: null, sort: '[{"id":"country","desc":true}]' });
    render(<CompanyListing />);

    expect(prefetchQuery.mock.calls[0][0].queryKey[2]).toEqual({
      page: 0,
      size: 10,
      sort: { field: 'headquarters.country', dir: 'desc' }
    });
  });

  it('skips the prefetch while a search is active', () => {
    params({ page: 1, perPage: 10, name: 'acme', sort: null });
    render(<CompanyListing />);

    expect(screen.getByText('company-table')).toBeInTheDocument();
    expect(prefetchQuery).not.toHaveBeenCalled();
  });
});
