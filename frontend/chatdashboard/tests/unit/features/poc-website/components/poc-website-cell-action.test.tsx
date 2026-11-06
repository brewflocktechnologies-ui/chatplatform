import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { refresh, client, invalidateEntity } = vi.hoisted(() => ({
  refresh: vi.fn(),
  invalidateEntity: vi.fn(),
  client: { current: null as unknown as import('@tanstack/react-query').QueryClient }
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('@/lib/query-client', () => ({ getQueryClient: () => client.current }));
vi.mock('@/lib/cache/invalidation', () => ({ invalidateEntity }));
vi.mock('@/features/poc-website/api/service', () => ({
  createPocWebsite: vi.fn(),
  updatePocWebsite: vi.fn(),
  deletePocWebsite: vi.fn()
}));
vi.mock('@/features/customers/api/service', () => ({
  getCustomers: vi.fn(),
  getAllCustomers: vi.fn().mockResolvedValue([]),
  getCustomer: vi.fn().mockResolvedValue(null)
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from 'sonner';
import { deletePocWebsite } from '@/features/poc-website/api/service';
import { PocWebsiteCellAction } from '@/features/poc-website/components/poc-website-cell-action';
import type { PocWebsite } from '@/features/poc-website/api/types';

const website = {
  id: 'w1',
  protocol: 'HTTPS',
  domain: 'example.com',
  companyId: '5',
  customerId: '5',
  customerName: 'Acme',
  flavour: 'Orange',
  businessCategory: 'Saas',
  dateAdded: null,
  isActive: true,
  isVerified: false,
  configName: 'Orange',
  configId: null
} satisfies PocWebsite;

function renderCell() {
  client.current = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <QueryClientProvider client={client.current}>
      <PocWebsiteCellAction data={website} />
    </QueryClientProvider>
  );
}

async function pick(item: string) {
  fireEvent.click(screen.getByRole('button', { name: /Open menu/ }));
  fireEvent.click(await screen.findByRole('menuitem', { name: new RegExp(item) }));
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('PocWebsiteCellAction', () => {
  it('lists the row actions under an Actions label', async () => {
    renderCell();
    fireEvent.click(screen.getByRole('button', { name: /Open menu/ }));
    expect(await screen.findByText('Actions')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Update/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Delete/ })).toBeInTheDocument();
  });

  it('opens the edit sheet for the row', async () => {
    renderCell();
    await pick('Update');
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Edit Website')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Domain/)).toHaveValue('example.com');
  });

  it('deletes after confirmation, invalidates the website cache and toasts success', async () => {
    vi.mocked(deletePocWebsite).mockResolvedValue({ ok: true, data: null });
    renderCell();
    await pick('Delete');
    const dialog = await screen.findByRole('dialog');
    expect(deletePocWebsite).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(deletePocWebsite).toHaveBeenCalledWith('w1'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Website deleted successfully'));
    expect(invalidateEntity).toHaveBeenCalledWith('pocWebsites');
    expect(refresh).toHaveBeenCalled();
  });

  it('does not delete when the confirmation is cancelled', async () => {
    renderCell();
    await pick('Delete');
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' })
    );
    expect(deletePocWebsite).not.toHaveBeenCalled();
  });

  it('shows the API message when the delete is rejected', async () => {
    vi.mocked(deletePocWebsite).mockResolvedValue({
      ok: false,
      status: 409,
      message: 'Website in use'
    });
    renderCell();
    await pick('Delete');
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Continue' })
    );

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Website in use'));
    expect(invalidateEntity).not.toHaveBeenCalled();
  });

  it('falls back to a generic message for an unexpected failure', async () => {
    vi.mocked(deletePocWebsite).mockRejectedValue(new Error('boom'));
    renderCell();
    await pick('Delete');
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Continue' })
    );

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to delete website'));
  });
});
