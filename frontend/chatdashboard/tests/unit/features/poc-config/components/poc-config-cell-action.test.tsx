import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { refresh, client } = vi.hoisted(() => ({
  refresh: vi.fn(),
  client: { current: null as unknown as import('@tanstack/react-query').QueryClient }
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('@/lib/query-client', () => ({ getQueryClient: () => client.current }));
vi.mock('@/features/poc-config/api/service', () => ({
  createPocConfig: vi.fn(),
  updatePocConfig: vi.fn(),
  deletePocConfig: vi.fn()
}));
vi.mock('@/features/customers/api/service', () => ({
  getCustomers: vi.fn(),
  getAllCustomers: vi.fn().mockResolvedValue([]),
  getCustomer: vi.fn().mockResolvedValue(null)
}));
vi.mock('@/features/poc-website/api/service', () => ({
  getPocWebsites: vi.fn().mockResolvedValue([]),
  getAllPocWebsites: vi.fn().mockResolvedValue([]),
  createPocWebsite: vi.fn(),
  updatePocWebsite: vi.fn(),
  deletePocWebsite: vi.fn()
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from 'sonner';
import { deletePocConfig } from '@/features/poc-config/api/service';
import { PocConfigCellAction } from '@/features/poc-config/components/poc-config-cell-action';
import type { PocConfig } from '@/features/poc-config/api/types';

const baseConfig: PocConfig = {
  id: 'c1',
  configName: 'Deploy Test',
  clientId: '7',
  clientName: 'ref@example.com',
  websiteId: 'w1',
  websiteLink: 'https://example.com',
  tenantId: 't1',
  cdnConfig: '{"theme":{"color":"red"}}',
  createdAt: null,
  updatedAt: null,
  createdBy: null,
  updatedBy: null,
  version: 1,
  new: false
};

function renderCell(data: PocConfig = baseConfig) {
  client.current = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <QueryClientProvider client={client.current}>
      <PocConfigCellAction data={data} />
    </QueryClientProvider>
  );
}

async function pick(item: string) {
  fireEvent.click(screen.getByRole('button', { name: /Open menu/ }));
  fireEvent.click(await screen.findByRole('menuitem', { name: new RegExp(item) }));
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('PocConfigCellAction', () => {
  it('lists view, update and delete under an Actions label', async () => {
    renderCell();
    fireEvent.click(screen.getByRole('button', { name: /Open menu/ }));
    expect(await screen.findByText('Actions')).toBeInTheDocument();
    for (const name of [/View config/, /Update/, /Delete/]) {
      expect(screen.getByRole('menuitem', { name })).toBeInTheDocument();
    }
  });

  it('shows the CDN config pretty-printed', async () => {
    renderCell();
    await pick('View config');
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Deploy Test config')).toBeInTheDocument();
    expect(within(dialog).getByText('CDN config served to the widget.')).toBeInTheDocument();
    expect(dialog.querySelector('pre')?.textContent).toBe(
      JSON.stringify({ theme: { color: 'red' } }, null, 2)
    );
  });

  it('shows a config that is not valid JSON as-is', async () => {
    renderCell({ ...baseConfig, cdnConfig: 'not json at all' });
    await pick('View config');
    const dialog = await screen.findByRole('dialog');
    expect(dialog.querySelector('pre')?.textContent).toBe('not json at all');
  });

  it('opens the prefilled edit sheet', async () => {
    renderCell();
    await pick('Update');
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Edit Config')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Config Name/)).toHaveValue('Deploy Test');
  });

  it('deletes after confirmation, refreshes and toasts success', async () => {
    vi.mocked(deletePocConfig).mockResolvedValue({ ok: true, data: null });
    renderCell();
    await pick('Delete');
    const dialog = await screen.findByRole('dialog');
    expect(deletePocConfig).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(deletePocConfig).toHaveBeenCalledWith('c1'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Config deleted successfully'));
    expect(refresh).toHaveBeenCalled();
  });

  it('does not delete when the confirmation is cancelled', async () => {
    renderCell();
    await pick('Delete');
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' })
    );
    expect(deletePocConfig).not.toHaveBeenCalled();
  });

  it('shows the API message when the delete is rejected', async () => {
    vi.mocked(deletePocConfig).mockResolvedValue({
      ok: false,
      status: 409,
      message: 'Config in use'
    });
    renderCell();
    await pick('Delete');
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Continue' })
    );

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Config in use'));
    expect(refresh).not.toHaveBeenCalled();
  });

  it('falls back to a generic message for an unexpected failure', async () => {
    vi.mocked(deletePocConfig).mockRejectedValue(new Error('boom'));
    renderCell();
    await pick('Delete');
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Continue' })
    );

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to delete config'));
  });
});
