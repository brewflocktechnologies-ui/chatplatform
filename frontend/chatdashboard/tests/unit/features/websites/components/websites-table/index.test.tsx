import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { Suspense } from 'react';

vi.mock('@/features/websites/api/service', () => ({
  getWebsites: vi.fn(),
  createWebsite: vi.fn(),
  updateWebsite: vi.fn(),
  deleteWebsite: vi.fn()
}));
vi.mock('@/features/websites/components/websites-table/cell-action', () => ({
  CellAction: () => <span>actions</span>
}));

import { getWebsites } from '@/features/websites/api/service';
import {
  WebsitesTable,
  WebsitesTableSkeleton
} from '@/features/websites/components/websites-table';

afterEach(cleanup);
beforeEach(() => {
  // jsdom lacks the Web Animations API that Base UI's scroll area polls for.
  Element.prototype.getAnimations ??= () => [];
  vi.clearAllMocks();
  vi.mocked(getWebsites).mockResolvedValue({
    success: true,
    total_websites: 25,
    websites: [
      {
        id: 'w1',
        protocol: 'HTTPS',
        domain: 'example.com',
        companyId: 'c1',
        customerId: 'c1',
        customerName: 'Acme',
        flavour: 'Orange',
        businessCategory: 'Saas',
        dateAdded: '2026-01-02T12:00:00Z',
        isActive: true,
        isVerified: true
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
          <WebsitesTable />
        </Suspense>
      </QueryClientProvider>
    </NuqsTestingAdapter>
  );
}

describe('WebsitesTable', () => {
  it('fetches with default pagination and renders rows', async () => {
    renderTable();
    expect(await screen.findByText('https://example.com')).toBeInTheDocument();
    expect(getWebsites).toHaveBeenCalledWith({ page: 1, limit: 10 });
  });

  it('maps url params onto the query filters', async () => {
    const sort = JSON.stringify([{ id: 'name', desc: true }]);
    renderTable(`?page=2&perPage=5&name=ex&category=Saas&sort=${encodeURIComponent(sort)}`);
    await screen.findByText('https://example.com');
    expect(getWebsites).toHaveBeenCalledWith({
      page: 2,
      limit: 5,
      search: 'ex',
      category: 'Saas',
      sort
    });
  });
});

describe('WebsitesTableSkeleton', () => {
  it('renders placeholder blocks', () => {
    const { container } = render(<WebsitesTableSkeleton />);
    expect(container.querySelectorAll('.bg-muted')).toHaveLength(3);
  });
});
