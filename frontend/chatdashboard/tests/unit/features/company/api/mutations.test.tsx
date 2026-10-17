import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { CompanyApiError } from '@/features/company/api/errors';
import type { CompanyMutationPayload } from '@/features/company/api/types';
import { makeCompany } from '../fixtures';

const { invalidateQueries } = vi.hoisted(() => ({ invalidateQueries: vi.fn() }));

vi.mock('@/lib/query-client', () => ({
  getQueryClient: () => ({ invalidateQueries })
}));
vi.mock('@/features/company/api/service', () => ({
  createCompany: vi.fn(),
  updateCompany: vi.fn(),
  deleteCompany: vi.fn()
}));

import { createCompany, deleteCompany, updateCompany } from '@/features/company/api/service';
import {
  createCompanyMutation,
  deleteCompanyMutation,
  updateCompanyMutation
} from '@/features/company/api/mutations';

function wrapper() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const payload = {
  name: 'Acme',
  customPlanIds: [],
  customerIds: []
} as unknown as CompanyMutationPayload;

beforeEach(() => vi.clearAllMocks());

describe('createCompanyMutation', () => {
  it('creates and invalidates the companies cache', async () => {
    vi.mocked(createCompany).mockResolvedValue({ ok: true, data: makeCompany({ id: 9 }) });
    const { result } = renderHook(() => useMutation(createCompanyMutation), { wrapper: wrapper() });

    act(() => result.current.mutate(payload));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(createCompany).toHaveBeenCalledWith(payload);
    expect(result.current.data?.id).toBe(9);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['companies'] });
  });

  it('throws a CompanyApiError for a failed result without invalidating', async () => {
    vi.mocked(createCompany).mockResolvedValue({
      ok: false,
      status: 400,
      message: 'Validation Failed',
      fieldErrors: { name: 'required' }
    });
    const { result } = renderHook(() => useMutation(createCompanyMutation), { wrapper: wrapper() });

    act(() => result.current.mutate(payload));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(CompanyApiError);
    expect((result.current.error as CompanyApiError).fieldErrors).toEqual({ name: 'required' });
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});

describe('updateCompanyMutation', () => {
  it('passes id and values through and invalidates', async () => {
    vi.mocked(updateCompany).mockResolvedValue({ ok: true, data: makeCompany() });
    const { result } = renderHook(() => useMutation(updateCompanyMutation), { wrapper: wrapper() });

    act(() => result.current.mutate({ id: 4, values: payload }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(updateCompany).toHaveBeenCalledWith(4, payload);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['companies'] });
  });
});

describe('deleteCompanyMutation', () => {
  it('deletes by id and invalidates', async () => {
    vi.mocked(deleteCompany).mockResolvedValue({ ok: true, data: null });
    const { result } = renderHook(() => useMutation(deleteCompanyMutation), { wrapper: wrapper() });

    act(() => result.current.mutate(4));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(deleteCompany).toHaveBeenCalledWith(4);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['companies'] });
  });

  it('surfaces a 404 as an error', async () => {
    vi.mocked(deleteCompany).mockResolvedValue({
      ok: false,
      status: 404,
      message: 'Company not found'
    });
    const { result } = renderHook(() => useMutation(deleteCompanyMutation), { wrapper: wrapper() });

    act(() => result.current.mutate(4));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect((result.current.error as CompanyApiError).status).toBe(404);
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
