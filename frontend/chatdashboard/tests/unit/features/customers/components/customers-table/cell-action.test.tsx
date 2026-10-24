import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { client } = vi.hoisted(() => ({
  client: { current: null as unknown as import('@tanstack/react-query').QueryClient }
}));
vi.mock('@/lib/query-client', () => ({ getQueryClient: () => client.current }));
vi.mock('@/features/customers/api/service', () => ({
  getCustomers: vi.fn(),
  getAllCustomers: vi.fn(),
  getCustomer: vi.fn(),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  deleteCustomer: vi.fn()
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { deleteCustomer } from '@/features/customers/api/service';
import { toast } from 'sonner';
import { CellAction } from '@/features/customers/components/customers-table/cell-action';
import type { Customer } from '@/features/customers/api/types';

const customer: Customer = {
  id: 8003,
  externalId: 'cus_1',
  email: 'aadhi@example.com',
  activePlan: null,
  billingAddress: null,
  creditCard: null,
  invoices: []
};

function wrap() {
  client.current = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <QueryClientProvider client={client.current}>
      <CellAction data={customer} />
    </QueryClientProvider>
  );
}

async function openMenuAndPick(name: RegExp) {
  fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
  fireEvent.click(await screen.findByRole('menuitem', { name }));
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('Customer CellAction', () => {
  it('opens the edit form from Update', async () => {
    wrap();
    await openMenuAndPick(/Update/);
    expect(await screen.findByText('Edit Customer')).toBeInTheDocument();
  });

  it('deletes after confirming, then toasts and invalidates', async () => {
    vi.mocked(deleteCustomer).mockResolvedValue({ ok: true, data: null });
    wrap();
    const invalidate = vi.spyOn(client.current, 'invalidateQueries');

    await openMenuAndPick(/Delete/);
    fireEvent.click(await screen.findByRole('button', { name: /continue|confirm|delete/i }));

    await waitFor(() => expect(deleteCustomer).toHaveBeenCalledWith(8003));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Customer deleted successfully')
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['customers'] });
  });

  it('reports the API error when the delete is unsupported', async () => {
    vi.mocked(deleteCustomer).mockResolvedValue({
      ok: false,
      status: 500,
      message: 'The customers API does not support deleting customers yet.'
    });
    wrap();

    await openMenuAndPick(/Delete/);
    fireEvent.click(await screen.findByRole('button', { name: /continue|confirm|delete/i }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'The customers API does not support deleting customers yet.'
      )
    );
  });
});
