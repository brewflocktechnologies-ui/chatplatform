import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { makePage, makePlan } from '../../../features/billing/fixtures';

vi.mock('@/features/billing/api/service', () => ({
  getPlans: vi.fn(),
  createPlan: vi.fn(),
  updatePlan: vi.fn(),
  deletePlan: vi.fn()
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard/billing' }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
// Mutations invalidate through the shared client; point it at the test client.
const { client } = vi.hoisted(() => ({ client: { current: null as unknown } }));
vi.mock('@/lib/query-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/query-client')>()),
  getQueryClient: () => client.current
}));

import { createPlan, deletePlan, getPlans, updatePlan } from '@/features/billing/api/service';
import { toast } from 'sonner';
import { InfobarProvider } from '@/components/ui/infobar';
import BillingPage from '@/app/dashboard/billing/page';
import { toPayload } from '@/features/billing/lib/plan-payload';

const starter = makePlan({
  id: 1,
  name: 'Starter',
  amountMonthly: 10,
  amountAnnually: 100
});
const free = makePlan({
  id: 2,
  name: 'Basic',
  description: null,
  freePlan: true,
  defaultPlan: true,
  amountMonthly: 0,
  amountAnnually: 0
});
const custom = makePlan({
  id: 3,
  name: 'Enterprise',
  custom: true,
  active: false,
  amountMonthly: 100,
  amountAnnually: 1200
});

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  client.current = queryClient;
  return render(
    <QueryClientProvider client={queryClient}>
      <InfobarProvider>
        <BillingPage />
      </InfobarProvider>
    </QueryClientProvider>
  );
}

const row = (name: string) => screen.getByText(name).closest('tr') as HTMLElement;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPlans).mockResolvedValue(
    makePage([starter, free, custom], { totalElements: 25, totalPages: 3 })
  );
});

afterEach(cleanup);

describe('BillingPage', () => {
  it('renders the header, stats and a row per plan', async () => {
    renderPage();

    expect(screen.getByText('Billing & Plans')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New plan/ })).toBeInTheDocument();

    expect(await screen.findByText('Starter')).toBeInTheDocument();
    expect(screen.getByText('Total plans').closest('[data-slot=card]')).toHaveTextContent('25');
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    expect(getPlans).toHaveBeenCalledWith({ page: 0, size: 10, status: 'all' });
  });

  it('shows prices, annual savings and badges per plan', async () => {
    renderPage();
    await screen.findByText('Starter');

    // $10/mo vs $100/yr → 17% saved.
    expect(within(row('Starter')).getByText('$10')).toBeInTheDocument();
    expect(within(row('Starter')).getByText('$100')).toBeInTheDocument();
    expect(within(row('Starter')).getByText('Save 17%')).toBeInTheDocument();

    // Free plans show no price or savings.
    expect(within(row('Basic')).getByText('Free')).toBeInTheDocument();
    expect(within(row('Basic')).getByText('Default')).toBeInTheDocument();
    expect(within(row('Basic')).queryByText(/Save/)).not.toBeInTheDocument();

    // A plan whose annual price isn't a discount shows no savings badge.
    expect(within(row('Enterprise')).getByText('Custom')).toBeInTheDocument();
    expect(within(row('Enterprise')).queryByText(/Save/)).not.toBeInTheDocument();
  });

  it('reflects each plan status in its switch', async () => {
    renderPage();
    await screen.findByText('Starter');

    expect(screen.getByRole('switch', { name: 'Deactivate Starter' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Activate Enterprise' })).not.toBeChecked();
  });

  it('refetches with the active filter and resets to the first page', async () => {
    renderPage();
    await screen.findByText('Starter');

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() =>
      expect(getPlans).toHaveBeenLastCalledWith({
        page: 1,
        size: 10,
        status: 'all'
      })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Active only' }));
    await waitFor(() =>
      expect(getPlans).toHaveBeenLastCalledWith({
        page: 0,
        size: 10,
        status: 'active'
      })
    );
  });

  it('disables Previous on the first page and Next on the last', async () => {
    vi.mocked(getPlans).mockResolvedValue(makePage([starter], { totalPages: 1 }));
    renderPage();
    await screen.findByText('Starter');

    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('shows an empty state when there are no plans', async () => {
    vi.mocked(getPlans).mockResolvedValue(makePage([]));
    renderPage();
    expect(await screen.findByText('No plans found.')).toBeInTheDocument();
  });

  it('shows an error with a working retry', async () => {
    vi.mocked(getPlans).mockRejectedValueOnce(new Error('boom'));
    renderPage();

    expect(await screen.findByText(/Couldn.t load plans/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Starter')).toBeInTheDocument();
  });

  describe('toggling active', () => {
    it('PUTs the whole plan with only `active` changed', async () => {
      vi.mocked(updatePlan).mockResolvedValue({ ok: true, data: starter });
      renderPage();
      await screen.findByText('Starter');

      fireEvent.click(screen.getByRole('switch', { name: 'Deactivate Starter' }));

      await waitFor(() =>
        expect(updatePlan).toHaveBeenCalledWith(1, toPayload(starter, { active: false }))
      );
    });

    it('toasts the API error message when the update fails', async () => {
      vi.mocked(updatePlan).mockResolvedValue({
        ok: false,
        status: 404,
        message: 'Plan not found, or the billing service failed'
      });
      renderPage();
      await screen.findByText('Starter');

      fireEvent.click(screen.getByRole('switch', { name: 'Deactivate Starter' }));

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith('Plan not found, or the billing service failed')
      );
    });
  });

  describe('creating a plan', () => {
    async function openCreate() {
      renderPage();
      await screen.findByText('Starter');
      fireEvent.click(screen.getByRole('button', { name: /New plan/ }));
      return await screen.findByRole('dialog');
    }

    it('validates before calling the API', async () => {
      const dialog = await openCreate();

      fireEvent.click(within(dialog).getByRole('button', { name: 'Create plan' }));

      expect(await within(dialog).findByText('Plan name is required')).toBeInTheDocument();
      expect(createPlan).not.toHaveBeenCalled();
    });

    it('POSTs the full payload with empty server-owned fields', async () => {
      vi.mocked(createPlan).mockResolvedValue({
        ok: true,
        data: makePlan({ id: 50 })
      });
      const dialog = await openCreate();

      fireEvent.change(within(dialog).getByLabelText(/^Name/), {
        target: { value: 'Growth' }
      });
      fireEvent.change(within(dialog).getByLabelText(/Monthly/), {
        target: { value: '20' }
      });
      fireEvent.change(within(dialog).getByLabelText(/Annual/), {
        target: { value: '200' }
      });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Create plan' }));

      await waitFor(() => expect(createPlan).toHaveBeenCalledTimes(1));
      expect(createPlan).toHaveBeenCalledWith({
        name: 'Growth',
        description: null,
        amountMonthly: 20,
        amountAnnually: 200,
        active: true,
        freePlan: false,
        defaultPlan: false,
        custom: false,
        companyIds: [],
        smartChatModule: null,
        managedAccountsModule: null,
        planProductPrice: null
      });
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Plan created'));
    });

    it('shows API field errors on the matching inputs', async () => {
      vi.mocked(createPlan).mockResolvedValue({
        ok: false,
        status: 400,
        message: 'Validation Failed',
        fieldErrors: { name: 'Plan name already exists' }
      });
      const dialog = await openCreate();

      fireEvent.change(within(dialog).getByLabelText(/^Name/), {
        target: { value: 'Starter' }
      });
      fireEvent.change(within(dialog).getByLabelText(/Monthly/), {
        target: { value: '20' }
      });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Create plan' }));

      expect(await within(dialog).findByText('Plan name already exists')).toBeInTheDocument();
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('toasts errors that are not tied to a field', async () => {
      vi.mocked(createPlan).mockResolvedValue({
        ok: false,
        status: 0,
        message: 'Billing service is unreachable'
      });
      const dialog = await openCreate();

      fireEvent.change(within(dialog).getByLabelText(/^Name/), {
        target: { value: 'Growth' }
      });
      fireEvent.change(within(dialog).getByLabelText(/Monthly/), {
        target: { value: '20' }
      });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Create plan' }));

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith('Billing service is unreachable')
      );
    });
  });

  describe('editing a plan', () => {
    async function openEdit(name: string) {
      renderPage();
      await screen.findByText(name);
      fireEvent.click(
        within(row(name)).getByRole('button', {
          name: new RegExp(`Open menu for ${name}`)
        })
      );
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }));
      return await screen.findByRole('dialog');
    }

    it('opens prefilled with the plan values', async () => {
      const dialog = await openEdit('Starter');

      expect(within(dialog).getByText('Edit plan')).toBeInTheDocument();
      expect(within(dialog).getByLabelText(/^Name/)).toHaveValue('Starter');
      expect(within(dialog).getByLabelText(/Monthly/)).toHaveValue(10);
      expect(within(dialog).getByLabelText(/Annual/)).toHaveValue(100);
    });

    it('PUTs the full plan, preserving fields the form does not edit', async () => {
      vi.mocked(updatePlan).mockResolvedValue({ ok: true, data: starter });
      const dialog = await openEdit('Starter');

      fireEvent.change(within(dialog).getByLabelText(/^Name/), {
        target: { value: 'Starter Plus' }
      });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));

      await waitFor(() => expect(updatePlan).toHaveBeenCalledTimes(1));
      const [id, body] = vi.mocked(updatePlan).mock.calls[0];
      expect(id).toBe(1);
      expect(body).toEqual(toPayload(starter, { name: 'Starter Plus' }));
      expect(body.companyIds).toEqual([7, 9]);
      expect(body).not.toHaveProperty('id');
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Plan updated'));
    });
  });

  describe('deleting a plan', () => {
    async function openDelete() {
      renderPage();
      await screen.findByText('Starter');
      fireEvent.click(
        within(row('Starter')).getByRole('button', {
          name: /Open menu for Starter/
        })
      );
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));
      return await screen.findByRole('dialog');
    }

    it('asks for confirmation and deletes the selected plan', async () => {
      vi.mocked(deletePlan).mockResolvedValue({ ok: true, data: starter });
      const dialog = await openDelete();

      expect(deletePlan).not.toHaveBeenCalled();
      fireEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));

      await waitFor(() => expect(deletePlan).toHaveBeenCalledWith(1));
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Plan deleted'));
    });

    it('does nothing when cancelled', async () => {
      const dialog = await openDelete();
      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(deletePlan).not.toHaveBeenCalled();
    });
  });
});
