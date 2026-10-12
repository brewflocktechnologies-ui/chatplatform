import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { client } = vi.hoisted(() => ({
  client: { current: null as unknown as import('@tanstack/react-query').QueryClient }
}));
vi.mock('@/lib/query-client', () => ({ getQueryClient: () => client.current }));
vi.mock('@/features/websites/api/service', () => ({
  getWebsites: vi.fn(),
  createWebsite: vi.fn(),
  updateWebsite: vi.fn(),
  deleteWebsite: vi.fn()
}));
vi.mock('@/features/customers/api/service', () => ({ getCustomers: vi.fn() }));
vi.mock('@/features/widget-modifier/api/service', () => ({
  getWidgetConfig: vi.fn(),
  getWidgetConfigs: vi.fn()
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { deleteWebsite } from '@/features/websites/api/service';
import { getCustomers } from '@/features/customers/api/service';
import { toast } from 'sonner';
import { CellAction } from '@/features/websites/components/websites-table/cell-action';
import type { Website } from '@/features/websites/api/types';

const website: Website = {
  id: 'w1',
  protocol: 'HTTPS',
  domain: 'example.com',
  companyId: 'c1',
  customerId: 'c1',
  customerName: 'Acme',
  flavour: 'Orange',
  businessCategory: 'Saas',
  dateAdded: '2026-01-01',
  isActive: true,
  isVerified: true
};

function renderCell() {
  client.current = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <QueryClientProvider client={client.current}>
      <CellAction data={website} />
    </QueryClientProvider>
  );
}

async function openMenu(item: string) {
  fireEvent.click(screen.getByRole('button', { name: /Open menu/ }));
  fireEvent.click(await screen.findByRole('menuitem', { name: new RegExp(item) }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCustomers).mockResolvedValue({ success: true, customers: [] } as never);
});
afterEach(cleanup);

describe('websites CellAction', () => {
  it('opens the live preview dialog', async () => {
    renderCell();
    await openMenu('Preview');
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Live Widget Preview: example\.com/)).toBeInTheDocument();
  });

  it('opens the embed code dialog', async () => {
    renderCell();
    await openMenu('Get Code');
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Install the chat widget')).toBeInTheDocument();
  });

  it('opens the edit sheet', async () => {
    renderCell();
    await openMenu('Update');
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Edit Website')).toBeInTheDocument();
  });

  it('deletes after confirming and toasts success', async () => {
    vi.mocked(deleteWebsite).mockResolvedValue({ success: true } as never);
    renderCell();
    await openMenu('Delete');

    const dialog = await screen.findByRole('dialog');
    expect(deleteWebsite).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(deleteWebsite).toHaveBeenCalledWith('w1'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Website deleted successfully'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('toasts an error when deletion fails', async () => {
    vi.mocked(deleteWebsite).mockRejectedValue(new Error('nope'));
    renderCell();
    await openMenu('Delete');

    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Continue' })
    );

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to delete website'));
  });

  it('cancels the delete confirmation', async () => {
    renderCell();
    await openMenu('Delete');
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(deleteWebsite).not.toHaveBeenCalled();
  });
});
