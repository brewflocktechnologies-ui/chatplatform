import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { makePage, makePlan } from '../fixtures';

vi.mock('@/features/billing/api/service', () => ({
  getPlans: vi.fn(),
  createPlan: vi.fn(),
  updatePlan: vi.fn(),
  deletePlan: vi.fn()
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const { client } = vi.hoisted(() => ({
  client: { current: null as unknown as import('@tanstack/react-query').QueryClient }
}));
vi.mock('@/lib/query-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/query-client')>()),
  getQueryClient: () => client.current
}));

import { deletePlan, getPlans, updatePlan } from '@/features/billing/api/service';
import { toast } from 'sonner';
import { PlanAdmin } from '@/features/billing/components/plan-admin';
import { PlanFormSheet, PlanFormSheetTrigger } from '@/features/billing/components/plan-form-sheet';
import { PlanDeleteModal } from '@/features/billing/components/plan-row-actions';

const starter = makePlan({ id: 1, name: 'Starter' });

function wrap(ui: React.ReactNode) {
  client.current = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(<QueryClientProvider client={client.current}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPlans).mockResolvedValue(makePage([starter], { totalElements: 25, totalPages: 3 }));
});
afterEach(cleanup);

describe('PlanAdmin extras', () => {
  it('refreshes the list on demand', async () => {
    wrap(<PlanAdmin />);
    await screen.findByText('Starter');
    const calls = vi.mocked(getPlans).mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: /Refresh/ }));

    await waitFor(() => expect(vi.mocked(getPlans).mock.calls.length).toBeGreaterThan(calls));
  });

  it('goes back a page with Previous', async () => {
    wrap(<PlanAdmin />);
    await screen.findByText('Starter');

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await screen.findByText('Page 2 of 3');
    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));

    expect(await screen.findByText('Page 1 of 3')).toBeInTheDocument();
  });

  it('shows the active-only stat label when filtered to active plans', async () => {
    wrap(<PlanAdmin />);
    await screen.findByText('Starter');
    fireEvent.click(screen.getByRole('button', { name: 'Active only' }));
    expect(await screen.findByText('Active plans')).toBeInTheDocument();
  });
});

describe('PlanFormSheet extras', () => {
  it('toasts a failed update that has no field errors', async () => {
    vi.mocked(updatePlan).mockResolvedValue({ ok: false, status: 500, message: 'Server down' });
    wrap(<PlanFormSheet plan={starter} open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Server down'));
  });

  it('paints matching field errors and toasts the unmatched ones', async () => {
    vi.mocked(updatePlan).mockResolvedValue({
      ok: false,
      status: 400,
      message: 'Validation Failed',
      fieldErrors: { name: 'Name taken', planProductPrice: 'Bad price' }
    });
    wrap(<PlanFormSheet plan={starter} open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(await within(dialog).findByText('Name taken')).toBeInTheDocument();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Bad price'));
  });

  it('falls back to the default message for an error without text', async () => {
    vi.mocked(updatePlan).mockRejectedValue(new Error(''));
    wrap(<PlanFormSheet plan={starter} open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't update plan. Try again.")
    );
  });

  it('opens a blank form from the New plan trigger', async () => {
    wrap(<PlanFormSheetTrigger />);
    fireEvent.click(screen.getByRole('button', { name: /New plan/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('New plan')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Name/)).toHaveValue('');
  });

  it('cancels via the Cancel button', async () => {
    const onOpenChange = vi.fn();
    wrap(<PlanFormSheet open onOpenChange={onOpenChange} />);
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('PlanDeleteModal extras', () => {
  it('toasts when deletion fails', async () => {
    vi.mocked(deletePlan).mockResolvedValue({ ok: false, status: 409, message: 'Plan in use' });
    wrap(<PlanDeleteModal plan={starter} open onOpenChange={vi.fn()} />);

    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Continue' })
    );

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Plan in use'));
  });

  it('does nothing on confirm when no plan is selected', async () => {
    wrap(<PlanDeleteModal plan={null} open onOpenChange={vi.fn()} />);

    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Continue' })
    );

    expect(deletePlan).not.toHaveBeenCalled();
  });
});
