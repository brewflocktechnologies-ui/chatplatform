import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('@/features/poc-widget/api/service', () => ({
  createPocWidget: vi.fn(),
  updatePocWidget: vi.fn(),
  deletePocWidget: vi.fn()
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from 'sonner';
import { deletePocWidget } from '@/features/poc-widget/api/service';
import { PocWidgetCellAction } from '@/features/poc-widget/components/poc-widget-cell-action';
import type { PocWidget } from '@/features/poc-widget/api/types';

const widget: PocWidget = {
  id: 4,
  companyId: 1,
  assistantId: 2,
  widgetName: 'Support widget',
  websiteUrl: null,
  position: 'BOTTOM_RIGHT',
  theme: 'LIGHT',
  primaryColor: '#007bff',
  greetingMessage: null,
  offlineMessage: null,
  showAgentName: true,
  showTypingIndicator: true,
  enableFileUpload: false,
  maxFileSizeMb: 10,
  enableSoundNotification: true,
  autoPopup: false,
  popupDelaySeconds: null,
  isActive: true,
  totalImpressions: 0,
  totalConversationsInitiated: 0,
  lastActivityDate: null,
  createdDate: null,
  modifiedDate: null
};

function renderCell() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <QueryClientProvider client={client}>
      <PocWidgetCellAction data={widget} />
    </QueryClientProvider>
  );
}

async function pick(item: string) {
  fireEvent.click(screen.getByRole('button', { name: /Open menu/ }));
  fireEvent.click(await screen.findByRole('menuitem', { name: new RegExp(item) }));
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('PocWidgetCellAction', () => {
  it('lists the row actions under an Actions label', async () => {
    renderCell();
    fireEvent.click(screen.getByRole('button', { name: /Open menu/ }));
    expect(await screen.findByText('Actions')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Update/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Delete/ })).toBeInTheDocument();
  });

  it('opens the prefilled edit sheet', async () => {
    renderCell();
    await pick('Update');
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Edit Widget')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Widget Name/)).toHaveValue('Support widget');
  });

  it('deletes after confirmation, refreshes and toasts success', async () => {
    vi.mocked(deletePocWidget).mockResolvedValue({ ok: true, data: null });
    renderCell();
    await pick('Delete');

    const dialog = await screen.findByRole('dialog');
    expect(deletePocWidget).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(deletePocWidget).toHaveBeenCalledWith(4));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Widget deleted successfully'));
    expect(refresh).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('does not delete when the confirmation is cancelled', async () => {
    renderCell();
    await pick('Delete');
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(deletePocWidget).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows the API message when the delete is rejected', async () => {
    vi.mocked(deletePocWidget).mockResolvedValue({
      ok: false,
      status: 404,
      message: 'Widget not found'
    });
    renderCell();
    await pick('Delete');
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Continue' })
    );

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Widget not found'));
    expect(refresh).not.toHaveBeenCalled();
  });

  it('falls back to a generic message for an unexpected failure', async () => {
    vi.mocked(deletePocWidget).mockRejectedValue(new Error('boom'));
    renderCell();
    await pick('Delete');
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Continue' })
    );

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to delete widget'));
  });
});
