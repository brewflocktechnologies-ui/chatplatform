import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const { invalidateQueries } = vi.hoisted(() => ({ invalidateQueries: vi.fn() }));

vi.mock('@/lib/query-client', () => ({
  getQueryClient: () => ({ invalidateQueries })
}));

vi.mock('@/features/websites/api/service', () => ({
  createWebsite: vi.fn(),
  updateWebsite: vi.fn(),
  deleteWebsite: vi.fn()
}));

import {
  createWebsite,
  updateWebsite,
  deleteWebsite
} from '@/features/websites/api/service';
import {
  createWebsiteMutation,
  updateWebsiteMutation,
  deleteWebsiteMutation
} from '@/features/websites/api/mutations';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } }
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const payload = {
  protocol: 'https',
  domain: 'example.com',
  customerId: 'cust-1',
  customerName: 'Acme',
  companyId: 'cust-1',
  businessCategory: 'ecommerce',
  flavour: 'default',
  configName: 'default',
  isActive: true,
  isVerified: false
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createWebsiteMutation', () => {
  it('creates a website and invalidates the websites cache', async () => {
    vi.mocked(createWebsite).mockResolvedValue({ success: true } as never);
    const { result } = renderHook(() => useMutation(createWebsiteMutation), {
      wrapper: createWrapper()
    });

    act(() => result.current.mutate(payload));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(createWebsite).toHaveBeenCalledWith(payload);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['websites'] });
  });

  it('surfaces service errors without invalidating', async () => {
    vi.mocked(createWebsite).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useMutation(createWebsiteMutation), {
      wrapper: createWrapper()
    });

    act(() => result.current.mutate(payload));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('boom'));
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});

describe('updateWebsiteMutation', () => {
  it('updates a website by id and invalidates the websites cache', async () => {
    vi.mocked(updateWebsite).mockResolvedValue({ success: true } as never);
    const { result } = renderHook(() => useMutation(updateWebsiteMutation), {
      wrapper: createWrapper()
    });

    act(() => result.current.mutate({ id: 'w-1', values: payload }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(updateWebsite).toHaveBeenCalledWith('w-1', payload);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['websites'] });
  });
});

describe('deleteWebsiteMutation', () => {
  it('deletes a website by id and invalidates the websites cache', async () => {
    vi.mocked(deleteWebsite).mockResolvedValue({ success: true } as never);
    const { result } = renderHook(() => useMutation(deleteWebsiteMutation), {
      wrapper: createWrapper()
    });

    act(() => result.current.mutate('w-2'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(deleteWebsite).toHaveBeenCalledWith('w-2');
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['websites'] });
  });
});
