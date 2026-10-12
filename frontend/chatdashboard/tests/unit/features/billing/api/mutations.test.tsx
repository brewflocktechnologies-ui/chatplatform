import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { PlanApiError } from '@/features/billing/api/errors';
import { toPayload } from '@/features/billing/lib/plan-payload';
import { makePlan } from '../fixtures';

const { invalidateQueries } = vi.hoisted(() => ({
  invalidateQueries: vi.fn()
}));

vi.mock('@/lib/query-client', () => ({
  getQueryClient: () => ({ invalidateQueries })
}));

vi.mock('@/features/billing/api/service', () => ({
  createPlan: vi.fn(),
  updatePlan: vi.fn(),
  deletePlan: vi.fn()
}));

import { createPlan, deletePlan, updatePlan } from '@/features/billing/api/service';
import {
  createPlanMutation,
  deletePlanMutation,
  updatePlanMutation
} from '@/features/billing/api/mutations';

function wrapper() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } }
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const payload = toPayload(makePlan());

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createPlanMutation', () => {
  it('creates a plan and invalidates the plans cache', async () => {
    vi.mocked(createPlan).mockResolvedValue({
      ok: true,
      data: makePlan({ id: 9 })
    });
    const { result } = renderHook(() => useMutation(createPlanMutation), {
      wrapper: wrapper()
    });

    act(() => result.current.mutate(payload));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(createPlan).toHaveBeenCalledWith(payload);
    expect(result.current.data?.id).toBe(9);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['plans'] });
  });

  it('surfaces a failed result as a PlanApiError without invalidating', async () => {
    vi.mocked(createPlan).mockResolvedValue({
      ok: false,
      status: 400,
      message: 'Validation Failed',
      fieldErrors: { name: 'Plan name is required' }
    });
    const { result } = renderHook(() => useMutation(createPlanMutation), {
      wrapper: wrapper()
    });

    act(() => result.current.mutate(payload));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(PlanApiError);
    expect((result.current.error as PlanApiError).fieldErrors).toEqual({
      name: 'Plan name is required'
    });
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});

describe('updatePlanMutation', () => {
  it('updates by id and invalidates the plans cache', async () => {
    vi.mocked(updatePlan).mockResolvedValue({ ok: true, data: makePlan() });
    const { result } = renderHook(() => useMutation(updatePlanMutation), {
      wrapper: wrapper()
    });

    act(() => result.current.mutate({ id: 4, values: payload }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(updatePlan).toHaveBeenCalledWith(4, payload);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['plans'] });
  });
});

describe('deletePlanMutation', () => {
  it('deletes by id and invalidates the plans cache', async () => {
    vi.mocked(deletePlan).mockResolvedValue({ ok: true, data: makePlan() });
    const { result } = renderHook(() => useMutation(deletePlanMutation), {
      wrapper: wrapper()
    });

    act(() => result.current.mutate(4));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(deletePlan).toHaveBeenCalledWith(4);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['plans'] });
  });
});
