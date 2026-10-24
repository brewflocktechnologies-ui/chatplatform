import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

import { createCustomer, updateCustomer } from '@/features/customers/api/service';
import { toast } from 'sonner';
import {
  CustomerFormSheet,
  CustomerFormSheetTrigger
} from '@/features/customers/components/customer-form-sheet';
import type { Customer } from '@/features/customers/api/types';

const customer: Customer = {
  id: 8003,
  externalId: 'cus_1',
  email: 'aadhi@example.com',
  activePlan: null,
  billingAddress: {
    line1: '1 Main Road',
    line2: null,
    city: 'Chennai',
    state: 'Tamil Nadu',
    postalCode: '600001',
    country: 'India'
  },
  creditCard: null,
  invoices: []
};

function wrap(ui: React.ReactNode) {
  client.current = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(<QueryClientProvider client={client.current}>{ui}</QueryClientProvider>);
}

const type = (dialog: HTMLElement, label: RegExp, value: string) =>
  fireEvent.change(within(dialog).getByLabelText(label), { target: { value } });

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('CustomerFormSheet (create)', () => {
  it('shows create copy and requires an email', async () => {
    wrap(<CustomerFormSheet open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByText('New Customer')).toBeInTheDocument();
    fireEvent.submit(dialog.querySelector('form')!);

    expect(await within(dialog).findByText('Email is required')).toBeInTheDocument();
    expect(createCustomer).not.toHaveBeenCalled();
  });

  it('rejects an invalid email', async () => {
    wrap(<CustomerFormSheet open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');

    type(dialog, /^Email/, 'nope');
    // jsdom's native type=email validation would block a button click before Zod runs.
    fireEvent.submit(dialog.querySelector('form')!);

    expect(await within(dialog).findByText('Please enter a valid email')).toBeInTheDocument();
    expect(createCustomer).not.toHaveBeenCalled();
  });

  it('sends blank fields as null, then toasts, invalidates and closes', async () => {
    vi.mocked(createCustomer).mockResolvedValue({ ok: true, data: customer });
    const onOpenChange = vi.fn();
    wrap(<CustomerFormSheet open onOpenChange={onOpenChange} />);
    const invalidate = vi.spyOn(client.current, 'invalidateQueries');
    const dialog = await screen.findByRole('dialog');

    type(dialog, /^Email/, '  new@example.com ');
    type(dialog, /^City/, 'Pune');
    fireEvent.submit(dialog.querySelector('form')!);

    await waitFor(() => expect(createCustomer).toHaveBeenCalledTimes(1));
    expect(createCustomer).toHaveBeenCalledWith({
      email: 'new@example.com',
      externalId: null,
      billingAddress: {
        line1: null,
        line2: null,
        city: 'Pune',
        state: null,
        postalCode: null,
        country: null
      }
    });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Customer created'));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['customers'] });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows the API message and stays open when the create fails', async () => {
    vi.mocked(createCustomer).mockResolvedValue({
      ok: false,
      status: 400,
      message: 'Input validation errors'
    });
    const onOpenChange = vi.fn();
    wrap(<CustomerFormSheet open onOpenChange={onOpenChange} />);
    const dialog = await screen.findByRole('dialog');

    type(dialog, /^Email/, 'new@example.com');
    fireEvent.submit(dialog.querySelector('form')!);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Input validation errors'));
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});

describe('CustomerFormSheet (edit)', () => {
  it('prefills the customer and sends cleared fields as empty strings', async () => {
    vi.mocked(updateCustomer).mockResolvedValue({ ok: true, data: customer });
    wrap(<CustomerFormSheet customer={customer} open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByText('Edit Customer')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Email/)).toHaveValue('aadhi@example.com');
    expect(within(dialog).getByLabelText(/^City/)).toHaveValue('Chennai');

    type(dialog, /^City/, '');
    fireEvent.submit(dialog.querySelector('form')!);

    await waitFor(() => expect(updateCustomer).toHaveBeenCalledTimes(1));
    expect(updateCustomer).toHaveBeenCalledWith(
      8003,
      expect.objectContaining({
        email: 'aadhi@example.com',
        externalId: 'cus_1',
        billingAddress: expect.objectContaining({ city: '', line2: '', line1: '1 Main Road' })
      })
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Customer updated'));
  });
});

describe('CustomerFormSheetTrigger', () => {
  it('opens the create form from the Add Customer button', async () => {
    wrap(<CustomerFormSheetTrigger />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Add Customer/ }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
