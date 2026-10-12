import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { Suspense } from 'react';

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />
}));
vi.mock('@/features/products/api/service', () => ({
  getProducts: vi.fn(),
  getProductById: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn()
}));
vi.mock('@/features/products/components/product-tables/cell-action', () => ({
  CellAction: () => <span>actions</span>
}));

import { getProducts } from '@/features/products/api/service';
import { ProductTable } from '@/features/products/components/product-tables';

afterEach(cleanup);
beforeEach(() => {
  // jsdom lacks the Web Animations API that Base UI's scroll area polls for.
  Element.prototype.getAnimations ??= () => [];
  vi.clearAllMocks();
  vi.mocked(getProducts).mockResolvedValue({
    success: true,
    total_products: 25,
    products: [
      {
        id: 7,
        name: 'Lamp',
        category: 'Toys',
        price: 12.5,
        description: 'A lamp',
        photo_url: 'http://x/img.png',
        created_at: '',
        updated_at: ''
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
          <ProductTable />
        </Suspense>
      </QueryClientProvider>
    </NuqsTestingAdapter>
  );
}

describe('ProductTable', () => {
  it('fetches with default pagination and renders rows', async () => {
    renderTable();
    expect(await screen.findByText('Lamp', { selector: 'div' })).toBeInTheDocument();
    expect(getProducts).toHaveBeenCalledWith({ page: 1, limit: 10 });
  });

  it('maps url params onto the query filters', async () => {
    const sort = JSON.stringify([{ id: 'name', desc: false }]);
    renderTable(`?page=2&perPage=5&name=la&category=Toys&sort=${encodeURIComponent(sort)}`);
    await screen.findByText('Lamp', { selector: 'div' });
    expect(getProducts).toHaveBeenCalledWith({
      page: 2,
      limit: 5,
      search: 'la',
      categories: 'Toys',
      sort
    });
  });
});
