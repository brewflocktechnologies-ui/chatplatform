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

import { createCustomer, updateCustomer } from '@/features/customers/api/service';
import { toast } from 'sonner';
import {
  CustomerFormSheet,
  CustomerFormSheetTrigger
} from '@/features/customers/components/customer-form-sheet';
import type { Customer } from '@/features/customers/api/types';

const customer: Customer = {
  id: 'c1',
  name: 'Acme',
  email: 'team@acme.com',
  country: 'india',
  dateAdded: '2026-01-02T00:00:00Z',
  integrations: '{"crm":"yes","analytics":"no"}',
  activePlanName: 'Basic',
  status: 'inactive'
};

function wrap(ui: React.ReactNode) {
  client.current = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(<QueryClientProvider client={client.current}>{ui}</QueryClientProvider>);
}

async function selectOption(trigger: HTMLElement, option: string) {
  fireEvent.pointerDown(trigger);
  fireEvent.click(trigger);
  const item = await screen.findByRole('option', { name: option });
  fireEvent.pointerDown(item);
  fireEvent.click(item);
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('CustomerFormSheet (create)', () => {
  it('shows the create copy and validates before submitting', async () => {
    const onOpenChange = vi.fn();
    wrap(<CustomerFormSheet open onOpenChange={onOpenChange} />);
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByText('New Customer')).toBeInTheDocument();
    expect(
      within(dialog).getByText('Fill in the details to create a new customer.')
    ).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create Customer' }));

    expect(
      await within(dialog).findByText('Name must be at least 2 characters')
    ).toBeInTheDocument();
    expect(createCustomer).not.toHaveBeenCalled();
  });

  it('submits a stringified payload, then toasts and closes', async () => {
    vi.mocked(createCustomer).mockResolvedValue({ success: true } as never);
    const onOpenChange = vi.fn();
    wrap(<CustomerFormSheet open onOpenChange={onOpenChange} />);
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: 'Globex' } });
    fireEvent.change(within(dialog).getByLabelText(/^Email/), {
      target: { value: 'hi@globex.com' }
    });
    fireEvent.change(within(dialog).getByLabelText(/^Country/), { target: { value: 'india' } });
    await selectOption(within(dialog).getByRole('combobox', { name: /Active Plan/ }), 'Premium');
    fireEvent.click(within(dialog).getByRole('switch', { name: /CRM Integration/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create Customer' }));

    await waitFor(() => expect(createCustomer).toHaveBeenCalledTimes(1));
    expect(createCustomer).toHaveBeenCalledWith({
      name: 'Globex',
      email: 'hi@globex.com',
      country: 'india',
      activePlanName: 'Premium',
      status: 'active',
      integrations: '{"crm":"yes","analytics":"no"}'
    });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Customer created'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('toasts when creation fails', async () => {
    vi.mocked(createCustomer).mockRejectedValue(new Error('boom'));
    wrap(<CustomerFormSheet open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: 'Globex' } });
    fireEvent.change(within(dialog).getByLabelText(/^Email/), {
      target: { value: 'hi@globex.com' }
    });
    fireEvent.change(within(dialog).getByLabelText(/^Country/), { target: { value: 'india' } });
    await selectOption(within(dialog).getByRole('combobox', { name: /Active Plan/ }), 'Free');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create Customer' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't create customer. Try again.")
    );
  });

  it('closes via Cancel', async () => {
    const onOpenChange = vi.fn();
    wrap(<CustomerFormSheet open onOpenChange={onOpenChange} />);
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('CustomerFormSheet (edit)', () => {
  it('prefills the fields, including parsed integrations', async () => {
    wrap(<CustomerFormSheet customer={customer} open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByText('Edit Customer')).toBeInTheDocument();
    expect(within(dialog).getByText('Update the customer details below.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Name/)).toHaveValue('Acme');
    expect(within(dialog).getByLabelText(/^Email/)).toHaveValue('team@acme.com');
    expect(within(dialog).getByRole('switch', { name: /CRM Integration/ })).toBeChecked();
    expect(within(dialog).getByRole('switch', { name: /Analytics Integration/ })).not.toBeChecked();
  });

  it('updates the customer by id and closes', async () => {
    vi.mocked(updateCustomer).mockResolvedValue({ success: true } as never);
    const onOpenChange = vi.fn();
    wrap(<CustomerFormSheet customer={customer} open onOpenChange={onOpenChange} />);
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: 'Acme 2' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Update Customer' }));

    await waitFor(() =>
      expect(updateCustomer).toHaveBeenCalledWith('c1', {
        name: 'Acme 2',
        email: 'team@acme.com',
        country: 'india',
        activePlanName: 'Basic',
        status: 'inactive',
        integrations: '{"crm":"yes","analytics":"no"}'
      })
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Customer updated'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('toasts when the update fails', async () => {
    vi.mocked(updateCustomer).mockRejectedValue(new Error('boom'));
    wrap(<CustomerFormSheet customer={customer} open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Update Customer' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't update customer. Try again.")
    );
  });
});

describe('CustomerFormSheetTrigger', () => {
  it('opens the sheet from the Add Customer button', async () => {
    wrap(<CustomerFormSheetTrigger />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Add Customer/ }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('New Customer')).toBeInTheDocument();
  });
});
