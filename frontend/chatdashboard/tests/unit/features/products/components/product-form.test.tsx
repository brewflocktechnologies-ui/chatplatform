import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { client, push, back } = vi.hoisted(() => ({
  client: { current: null as unknown as import('@tanstack/react-query').QueryClient },
  push: vi.fn(),
  back: vi.fn()
}));
vi.mock('@/lib/query-client', () => ({ getQueryClient: () => client.current }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, back }) }));
vi.mock('@/features/products/api/service', () => ({
  getProducts: vi.fn(),
  getProductById: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn()
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
// The real uploader is a react-dropzone widget; stub it with buttons that emit files.
vi.mock('@/components/file-uploader', () => ({
  FileUploader: ({
    onValueChange
  }: {
    onValueChange: (files: File[] | ((prev: File[]) => File[])) => void;
  }) => {
    const file = new File(['x'], 'p.png', { type: 'image/png' });
    return (
      <div>
        <button type='button' onClick={() => onValueChange([file])}>
          upload-direct
        </button>
        <button type='button' onClick={() => onValueChange((prev) => [...prev, file])}>
          upload-updater
        </button>
      </div>
    );
  }
}));

import { createProduct, updateProduct } from '@/features/products/api/service';
import { toast } from 'sonner';
import ProductForm from '@/features/products/components/product-form';

const product = {
  id: 7,
  name: 'Lamp',
  category: 'home',
  price: 12.5,
  description: 'A very nice lamp',
  photo_url: 'http://x/img.png',
  created_at: '',
  updated_at: ''
};

function renderForm(initialData: typeof product | null = null) {
  client.current = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <QueryClientProvider client={client.current}>
      <ProductForm initialData={initialData} pageTitle='Product Title' />
    </QueryClientProvider>
  );
}

async function selectCategory(option: string) {
  const trigger = screen.getByRole('combobox', { name: /Category/ });
  fireEvent.pointerDown(trigger);
  fireEvent.click(trigger);
  const item = await screen.findByRole('option', { name: option });
  fireEvent.pointerDown(item);
  fireEvent.click(item);
}

async function fillValid(upload = 'upload-direct') {
  fireEvent.click(screen.getByRole('button', { name: upload }));
  fireEvent.change(screen.getByLabelText(/^Product Name/), { target: { value: 'Desk' } });
  await selectCategory('Home & Garden');
  fireEvent.change(screen.getByLabelText(/^Price/), { target: { value: '19.99' } });
  fireEvent.change(screen.getByLabelText(/^Description/), {
    target: { value: 'A sturdy wooden desk' }
  });
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('ProductForm (create)', () => {
  it('renders the title and validates required fields before submitting', async () => {
    renderForm();
    expect(screen.getByText('Product Title')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add Product' }));

    expect(await screen.findByText('Image is required.')).toBeInTheDocument();
    expect(screen.getByText('Product name must be at least 2 characters.')).toBeInTheDocument();
    expect(screen.getByText('Price is required')).toBeInTheDocument();
    expect(createProduct).not.toHaveBeenCalled();
  });

  it('creates the product, toasts and navigates to the list', async () => {
    vi.mocked(createProduct).mockResolvedValue({ success: true } as never);
    renderForm();
    await fillValid();

    fireEvent.click(screen.getByRole('button', { name: 'Add Product' }));

    await waitFor(() =>
      expect(createProduct).toHaveBeenCalledWith({
        name: 'Desk',
        category: 'home',
        price: 19.99,
        description: 'A sturdy wooden desk'
      })
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Product created'));
    expect(push).toHaveBeenCalledWith('/dashboard/product');
  });

  it('accepts files delivered through a state updater', async () => {
    vi.mocked(createProduct).mockResolvedValue({ success: true } as never);
    renderForm();
    await fillValid('upload-updater');

    fireEvent.click(screen.getByRole('button', { name: 'Add Product' }));

    await waitFor(() => expect(createProduct).toHaveBeenCalledTimes(1));
  });

  it('toasts when creation fails and stays on the page', async () => {
    vi.mocked(createProduct).mockRejectedValue(new Error('boom'));
    renderForm();
    await fillValid();

    fireEvent.click(screen.getByRole('button', { name: 'Add Product' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't create product. Try again.")
    );
    expect(push).not.toHaveBeenCalled();
  });

  it('goes back on Cancel', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(back).toHaveBeenCalled();
  });
});

describe('ProductForm (edit)', () => {
  it('prefills the fields and shows the update label', () => {
    renderForm(product);
    expect(screen.getByLabelText(/^Product Name/)).toHaveValue('Lamp');
    expect(screen.getByLabelText(/^Price/)).toHaveValue(12.5);
    expect(screen.getByLabelText(/^Description/)).toHaveValue('A very nice lamp');
    expect(screen.getByRole('button', { name: 'Update Product' })).toBeInTheDocument();
  });

  it('updates by id, toasts and navigates', async () => {
    vi.mocked(updateProduct).mockResolvedValue({ success: true } as never);
    renderForm(product);
    fireEvent.click(screen.getByRole('button', { name: 'upload-direct' }));
    fireEvent.change(screen.getByLabelText(/^Product Name/), { target: { value: 'Lamp 2' } });

    fireEvent.click(screen.getByRole('button', { name: 'Update Product' }));

    await waitFor(() =>
      expect(updateProduct).toHaveBeenCalledWith(7, {
        name: 'Lamp 2',
        category: 'home',
        price: 12.5,
        description: 'A very nice lamp'
      })
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Product updated'));
    expect(push).toHaveBeenCalledWith('/dashboard/product');
  });

  it('toasts when the update fails', async () => {
    vi.mocked(updateProduct).mockRejectedValue(new Error('boom'));
    renderForm(product);
    fireEvent.click(screen.getByRole('button', { name: 'upload-direct' }));

    fireEvent.click(screen.getByRole('button', { name: 'Update Product' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't update product. Try again.")
    );
  });
});
