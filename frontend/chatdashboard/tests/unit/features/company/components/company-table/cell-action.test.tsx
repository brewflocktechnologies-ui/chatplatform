import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { client } = vi.hoisted(() => ({
  client: { current: null as unknown as import('@tanstack/react-query').QueryClient }
}));
vi.mock('@/lib/query-client', () => ({ getQueryClient: () => client.current }));
vi.mock('@/features/company/api/service', () => ({
  getCompanies: vi.fn(),
  getAllCompanies: vi.fn(),
  createCompany: vi.fn(),
  updateCompany: vi.fn(),
  deleteCompany: vi.fn()
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { deleteCompany } from '@/features/company/api/service';
import { toast } from 'sonner';
import { CellAction } from '@/features/company/components/company-table/cell-action';
import { makeCompany } from '../../fixtures';

const company = makeCompany({ id: 7 });

function renderCell() {
  client.current = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <QueryClientProvider client={client.current}>
      <CellAction data={company} />
    </QueryClientProvider>
  );
}

async function openMenu(item: string) {
  fireEvent.click(screen.getByRole('button', { name: /Open menu/ }));
  fireEvent.click(await screen.findByRole('menuitem', { name: new RegExp(item) }));
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('company CellAction', () => {
  it('opens the edit sheet', async () => {
    renderCell();
    await openMenu('Update');
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Edit Company')).toBeInTheDocument();
  });

  it('deletes after confirming, toasts and invalidates', async () => {
    vi.mocked(deleteCompany).mockResolvedValue({ ok: true, data: null });
    renderCell();
    const invalidate = vi.spyOn(client.current, 'invalidateQueries');
    await openMenu('Delete');

    const dialog = await screen.findByRole('dialog');
    expect(deleteCompany).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(deleteCompany).toHaveBeenCalledWith(7));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Company deleted successfully'));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['companies'] });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows the API message when deletion fails', async () => {
    vi.mocked(deleteCompany).mockResolvedValue({
      ok: false,
      status: 404,
      message: 'Company not found'
    });
    renderCell();
    await openMenu('Delete');

    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Continue' })
    );

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Company not found'));
  });

  it('falls back to a generic message for unexpected errors', async () => {
    vi.mocked(deleteCompany).mockRejectedValue(new Error('network'));
    renderCell();
    await openMenu('Delete');

    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Continue' })
    );

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to delete company'));
  });

  it('cancels the delete confirmation', async () => {
    renderCell();
    await openMenu('Delete');
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(deleteCompany).not.toHaveBeenCalled();
  });
});
