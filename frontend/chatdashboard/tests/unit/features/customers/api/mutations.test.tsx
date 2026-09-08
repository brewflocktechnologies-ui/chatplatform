import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const { invalidateQueries } = vi.hoisted(() => ({ invalidateQueries: vi.fn() }));

vi.mock('@/lib/query-client', () => ({
  getQueryClient: () => ({ invalidateQueries })
}));

vi.mock('@/features/customers/api/service', () => ({
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  deleteCustomer: vi.fn()
}));

import {
  createCustomer,
  updateCustomer,
  deleteCustomer
} from '@/features/customers/api/service';
import {
  createCustomerMutation,
  updateCustomerMutation,
  deleteCustomerMutation
} from '@/features/customers/api/mutations';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } }
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const payload = {
  name: 'Acme',
  email: 'acme@example.com',
  country: 'Germany',
  activePlanName: 'pro',
  status: 'active',
  integrations: '{"crm":"yes","analytics":"no"}'
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createCustomerMutation', () => {
  it('creates a customer and invalidates the customers cache', async () => {
    vi.mocked(createCustomer).mockResolvedValue({ success: true } as never);
    const { result } = renderHook(() => useMutation(createCustomerMutation), {
      wrapper: createWrapper()
    });

    act(() => result.current.mutate(payload));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(createCustomer).toHaveBeenCalledWith(payload);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['customers'] });
  });

  it('surfaces service errors without invalidating', async () => {
    vi.mocked(createCustomer).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useMutation(createCustomerMutation), {
      wrapper: createWrapper()
    });

    act(() => result.current.mutate(payload));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('boom'));
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});

describe('updateCustomerMutation', () => {
  it('updates a customer by id and invalidates the customers cache', async () => {
    vi.mocked(updateCustomer).mockResolvedValue({ success: true } as never);
    const { result } = renderHook(() => useMutation(updateCustomerMutation), {
      wrapper: createWrapper()
    });

    act(() => result.current.mutate({ id: 'c-1', values: payload }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(updateCustomer).toHaveBeenCalledWith('c-1', payload);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['customers'] });
  });
});

describe('deleteCustomerMutation', () => {
  it('deletes a customer by id and invalidates the customers cache', async () => {
    vi.mocked(deleteCustomer).mockResolvedValue({ success: true } as never);
    const { result } = renderHook(() => useMutation(deleteCustomerMutation), {
      wrapper: createWrapper()
    });

    act(() => result.current.mutate('c-2'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(deleteCustomer).toHaveBeenCalledWith('c-2');
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['customers'] });
  });
});
