import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const { invalidateQueries } = vi.hoisted(() => ({ invalidateQueries: vi.fn() }));

vi.mock('@/lib/query-client', () => ({
  getQueryClient: () => ({ invalidateQueries })
}));

vi.mock('@/features/products/api/service', () => ({
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn()
}));

import {
  createProduct,
  updateProduct,
  deleteProduct
} from '@/features/products/api/service';
import {
  createProductMutation,
  updateProductMutation,
  deleteProductMutation
} from '@/features/products/api/mutations';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } }
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const payload = {
  name: 'Widget',
  description: 'A very useful widget',
  price: 9.99,
  category: 'Electronics'
} as never;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createProductMutation', () => {
  it('creates a product and invalidates the products cache', async () => {
    vi.mocked(createProduct).mockResolvedValue({ success: true } as never);
    const { result } = renderHook(() => useMutation(createProductMutation), {
      wrapper: createWrapper()
    });

    act(() => result.current.mutate(payload));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(createProduct).toHaveBeenCalledWith(payload);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['products'] });
  });

  it('surfaces service errors without invalidating', async () => {
    vi.mocked(createProduct).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useMutation(createProductMutation), {
      wrapper: createWrapper()
    });

    act(() => result.current.mutate(payload));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('boom'));
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});

describe('updateProductMutation', () => {
  it('updates a product by numeric id and invalidates the products cache', async () => {
    vi.mocked(updateProduct).mockResolvedValue({ success: true } as never);
    const { result } = renderHook(() => useMutation(updateProductMutation), {
      wrapper: createWrapper()
    });

    act(() => result.current.mutate({ id: 3, values: payload }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(updateProduct).toHaveBeenCalledWith(3, payload);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['products'] });
  });
});

describe('deleteProductMutation', () => {
  it('deletes a product by numeric id and invalidates the products cache', async () => {
    vi.mocked(deleteProduct).mockResolvedValue({ success: true } as never);
    const { result } = renderHook(() => useMutation(deleteProductMutation), {
      wrapper: createWrapper()
    });

    act(() => result.current.mutate(9));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(deleteProduct).toHaveBeenCalledWith(9);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['products'] });
  });
});
