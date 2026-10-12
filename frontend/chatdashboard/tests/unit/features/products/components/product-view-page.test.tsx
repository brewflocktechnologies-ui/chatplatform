import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense } from 'react';

const { notFound } = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  })
}));
vi.mock('next/navigation', () => ({
  notFound,
  useRouter: () => ({ push: vi.fn(), back: vi.fn() })
}));
vi.mock('@/features/products/api/service', () => ({
  getProducts: vi.fn(),
  getProductById: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn()
}));
vi.mock('@/features/products/components/product-form', () => ({
  default: ({
    initialData,
    pageTitle
  }: {
    initialData: { name: string } | null;
    pageTitle: string;
  }) => (
    <div>
      form:{pageTitle}:{initialData?.name ?? 'none'}
    </div>
  )
}));

import { getProductById } from '@/features/products/api/service';
import ProductViewPage from '@/features/products/components/product-view-page';

function renderPage(productId: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Suspense fallback={<div>loading</div>}>
        <ErrorCatcher>
          <ProductViewPage productId={productId} />
        </ErrorCatcher>
      </Suspense>
    </QueryClientProvider>
  );
}

import { Component, type ReactNode } from 'react';
class ErrorCatcher extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    return this.state.error ? <div>caught:{this.state.error.message}</div> : this.props.children;
  }
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('ProductViewPage', () => {
  it('renders an empty create form for "new" without fetching', () => {
    renderPage('new');
    expect(screen.getByText('form:Create New Product:none')).toBeInTheDocument();
    expect(getProductById).not.toHaveBeenCalled();
  });

  it('loads the product and renders the edit form', async () => {
    vi.mocked(getProductById).mockResolvedValue({
      success: true,
      product: { id: 5, name: 'Lamp' }
    } as never);
    renderPage('5');
    expect(await screen.findByText('form:Edit Product:Lamp')).toBeInTheDocument();
    expect(getProductById).toHaveBeenCalledWith(5);
  });

  it('calls notFound when the lookup is unsuccessful', async () => {
    vi.mocked(getProductById).mockResolvedValue({ success: false } as never);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderPage('9');
    await waitFor(() => expect(notFound).toHaveBeenCalled());
    expect(await screen.findByText('caught:NEXT_NOT_FOUND')).toBeInTheDocument();
  });

  it('calls notFound when the product is missing', async () => {
    vi.mocked(getProductById).mockResolvedValue({ success: true, product: null } as never);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderPage('9');
    await waitFor(() => expect(notFound).toHaveBeenCalled());
  });
});
