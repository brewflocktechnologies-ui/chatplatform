import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { client, push } = vi.hoisted(() => ({
  client: { current: null as unknown as import('@tanstack/react-query').QueryClient },
  push: vi.fn()
}));
vi.mock('@/lib/query-client', () => ({ getQueryClient: () => client.current }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/features/products/api/service', () => ({
  getProducts: vi.fn(),
  getProductById: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn()
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { deleteProduct } from '@/features/products/api/service';
import { toast } from 'sonner';
import { CellAction } from '@/features/products/components/product-tables/cell-action';

const product = {
  id: 7,
  name: 'Lamp',
  category: 'home',
  price: 12.5,
  description: 'A lamp',
  photo_url: 'http://x/img.png',
  created_at: '',
  updated_at: ''
};

function renderCell() {
  client.current = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <QueryClientProvider client={client.current}>
      <CellAction data={product} />
    </QueryClientProvider>
  );
}

async function openMenu(item: string) {
  fireEvent.click(screen.getByRole('button', { name: /Open menu/ }));
  fireEvent.click(await screen.findByRole('menuitem', { name: new RegExp(item) }));
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('products CellAction', () => {
  it('navigates to the edit page', async () => {
    renderCell();
    await openMenu('Update');
    expect(push).toHaveBeenCalledWith('/dashboard/product/7');
  });

  it('deletes after confirming and toasts success', async () => {
    vi.mocked(deleteProduct).mockResolvedValue({ success: true } as never);
    renderCell();
    await openMenu('Delete');

    const dialog = await screen.findByRole('dialog');
    expect(deleteProduct).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(deleteProduct).toHaveBeenCalledWith(7));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Product deleted successfully'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('toasts an error when deletion fails', async () => {
    vi.mocked(deleteProduct).mockRejectedValue(new Error('nope'));
    renderCell();
    await openMenu('Delete');

    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Continue' })
    );

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to delete product'));
  });

  it('cancels the delete confirmation', async () => {
    renderCell();
    await openMenu('Delete');
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(deleteProduct).not.toHaveBeenCalled();
  });
});
