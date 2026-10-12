import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { client } = vi.hoisted(() => ({
  client: { current: null as unknown as import('@tanstack/react-query').QueryClient }
}));
vi.mock('@/lib/query-client', () => ({ getQueryClient: () => client.current }));
vi.mock('@/features/customers/api/service', () => ({
  getCustomers: vi.fn(),
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
  id: 'c1',
  name: 'Acme',
  email: 'team@acme.com',
  country: 'india',
  dateAdded: '2026-01-02T00:00:00Z',
  integrations: '{"crm":"yes","analytics":"no"}',
  activePlanName: 'Basic',
  status: 'active'
};

function renderCell() {
  client.current = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <QueryClientProvider client={client.current}>
      <CellAction data={customer} />
    </QueryClientProvider>
  );
}

async function openMenu(item: string) {
  fireEvent.click(screen.getByRole('button', { name: /Open menu/ }));
  fireEvent.click(await screen.findByRole('menuitem', { name: new RegExp(item) }));
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('customers CellAction', () => {
  it('opens the edit sheet prefilled from the row', async () => {
    renderCell();
    await openMenu('Update');

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Edit Customer')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Name/)).toHaveValue('Acme');
  });

  it('deletes after confirming and toasts success', async () => {
    vi.mocked(deleteCustomer).mockResolvedValue({ success: true } as never);
    renderCell();
    await openMenu('Delete');

    const dialog = await screen.findByRole('dialog');
    expect(deleteCustomer).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(deleteCustomer).toHaveBeenCalledWith('c1'));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Customer deleted successfully')
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('toasts an error when deletion fails', async () => {
    vi.mocked(deleteCustomer).mockRejectedValue(new Error('nope'));
    renderCell();
    await openMenu('Delete');

    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Continue' })
    );

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to delete customer'));
  });

  it('closes the confirm dialog on cancel without deleting', async () => {
    renderCell();
    await openMenu('Delete');

    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' })
    );

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(deleteCustomer).not.toHaveBeenCalled();
  });
});
