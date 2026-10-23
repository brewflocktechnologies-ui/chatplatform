import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { Suspense } from 'react';

vi.mock('@/features/company/api/service', () => ({
  getCompanies: vi.fn(),
  getAllCompanies: vi.fn(),
  createCompany: vi.fn(),
  updateCompany: vi.fn(),
  deleteCompany: vi.fn()
}));
vi.mock('@/features/company/components/company-table/cell-action', () => ({
  CellAction: () => <span>actions</span>
}));

import { getAllCompanies, getCompanies } from '@/features/company/api/service';
import { CompanyTable } from '@/features/company/components/company-table';
import { makeCompany, makeCompanyPage } from '../../fixtures';

afterEach(cleanup);
beforeEach(() => {
  // jsdom lacks the Web Animations API that Base UI's scroll area polls for.
  Element.prototype.getAnimations ??= () => [];
  vi.clearAllMocks();
  vi.mocked(getCompanies).mockResolvedValue(
    makeCompanyPage([makeCompany({ id: 1, name: 'Acme Corp' })], { totalPages: 3 })
  );
  vi.mocked(getAllCompanies).mockResolvedValue([
    makeCompany({ id: 1, name: 'Acme Corp' }),
    makeCompany({ id: 2, name: 'Globex', companyDetails: null, headquarters: null }),
    makeCompany({ id: 3, name: 'Acme Labs' })
  ]);
});

function renderTable(searchParams = '') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <NuqsTestingAdapter searchParams={searchParams}>
      <QueryClientProvider client={client}>
        <Suspense fallback={<div>loading</div>}>
          <CompanyTable />
        </Suspense>
      </QueryClientProvider>
    </NuqsTestingAdapter>
  );
}

describe('CompanyTable', () => {
  it('pages through the API with a 0-based page by default', async () => {
    renderTable();
    expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
    expect(getCompanies).toHaveBeenCalledWith({ page: 0, size: 10, sort: undefined });
    expect(getAllCompanies).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Add Company/ })).toBeInTheDocument();
  });

  it('maps page, perPage and sort params onto the API query', async () => {
    const sort = JSON.stringify([{ id: 'city', desc: true }]);
    renderTable(`?page=2&perPage=20&sort=${encodeURIComponent(sort)}`);
    await screen.findByText('Acme Corp');
    expect(getCompanies).toHaveBeenCalledWith({
      page: 1,
      size: 20,
      sort: { field: 'headquarters.city', dir: 'desc' }
    });
  });

  it('loads everything and filters locally while searching', async () => {
    renderTable('?name=acme');

    expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Acme Labs')).toBeInTheDocument();
    expect(screen.queryByText('Globex')).not.toBeInTheDocument();
    expect(getAllCompanies).toHaveBeenCalledWith(undefined);
    expect(getCompanies).not.toHaveBeenCalled();
  });

  it('paginates the local search results', async () => {
    renderTable('?name=acme&perPage=1&page=2');

    expect(await screen.findByText('Acme Labs')).toBeInTheDocument();
    expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument();
  });

  it('shows a searching indicator until everything has loaded', async () => {
    vi.mocked(getAllCompanies).mockReturnValue(new Promise(() => {}));
    renderTable('?name=acme');

    expect(await screen.findByRole('status')).toHaveTextContent('Searching all companies');
  });
});
