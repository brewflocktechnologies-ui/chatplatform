import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('@/features/poc-website/api/service', () => ({
  createPocWebsite: vi.fn(),
  updatePocWebsite: vi.fn(),
  deletePocWebsite: vi.fn()
}));
vi.mock('@/features/customers/api/service', () => ({
  getCustomers: vi.fn(),
  getAllCustomers: vi.fn(),
  getCustomer: vi.fn().mockResolvedValue(null)
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { createPocWebsite } from '@/features/poc-website/api/service';
import { getAllCustomers, getCustomer } from '@/features/customers/api/service';
import { PocWebsiteFormSheet } from '@/features/poc-website/components/poc-website-form-sheet';
import type { PocWebsite } from '@/features/poc-website/api/types';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAllCustomers).mockResolvedValue([
    { id: 103, email: 'mode1@example.com' },
    { id: 153, email: 'mode2@example.com' }
  ] as never);
});
afterEach(cleanup);

function wrap(ui: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

async function selectOption(trigger: HTMLElement, option: string | RegExp) {
  fireEvent.pointerDown(trigger);
  fireEvent.click(trigger);
  const item = await screen.findByRole('option', { name: option });
  fireEvent.pointerDown(item);
  fireEvent.click(item);
}

describe('PocWebsiteFormSheet customer picker', () => {
  it('lists customers from the customers API and sets both id and name on the website', async () => {
    vi.mocked(createPocWebsite).mockResolvedValue({ ok: true, data: null });
    wrap(<PocWebsiteFormSheet open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');

    expect(getAllCustomers).toHaveBeenCalledWith({ field: 'email', dir: 'asc' });
    expect(within(dialog).queryByLabelText(/Customer Name/)).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/Customer ID/)).not.toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText(/^Domain/), { target: { value: 'site.io' } });
    await selectOption(within(dialog).getByRole('combobox', { name: /Customer/ }), /mode2/);
    await selectOption(
      within(dialog).getByRole('combobox', { name: /Business Category/ }),
      'Retail'
    );
    fireEvent.change(within(dialog).getByLabelText(/^Flavour/), { target: { value: 'Blue' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create Website' }));

    await waitFor(() => expect(createPocWebsite).toHaveBeenCalledTimes(1));
    expect(createPocWebsite).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: 'site.io',
        customerId: '153',
        customerName: 'mode2@example.com',
        companyId: '153'
      })
    );
  });

  it('requires a customer', async () => {
    wrap(<PocWebsiteFormSheet open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create Website' }));

    expect(await within(dialog).findByText('Customer ID is required')).toBeInTheDocument();
    expect(createPocWebsite).not.toHaveBeenCalled();
  });

  it('does not load customers while closed', () => {
    wrap(<PocWebsiteFormSheet open={false} onOpenChange={vi.fn()} />);
    expect(getAllCustomers).not.toHaveBeenCalled();
  });

  it('keeps the saved customer selectable on edit when it is not in the list', async () => {
    const website = {
      id: 'w1',
      protocol: 'HTTPS',
      domain: 'example.com',
      companyId: '999',
      customerId: '999',
      customerName: 'old@example.com',
      flavour: 'Orange',
      businessCategory: 'Saas',
      dateAdded: null,
      isActive: true,
      isVerified: false,
      configName: 'Orange',
      configId: null
    } satisfies PocWebsite;
    wrap(<PocWebsiteFormSheet website={website} open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByRole('combobox', { name: /Customer/ })).toHaveTextContent(
      'old@example.com'
    );
  });

  it('labels a saved customer with a nameless website by looking it up, not by showing the id', async () => {
    // The full list never arrives; the single lookup still resolves the label.
    vi.mocked(getAllCustomers).mockReturnValue(new Promise(() => {}));
    vi.mocked(getCustomer).mockResolvedValue({ id: 7953, email: 'ref1@example.com' } as never);
    const website = {
      id: 'w2',
      protocol: 'HTTPS',
      domain: 'ref-test.example.com',
      companyId: '7953',
      customerId: '7953',
      customerName: '',
      flavour: 'Orange',
      businessCategory: 'Saas',
      dateAdded: null,
      isActive: true,
      isVerified: false,
      configName: 'Orange',
      configId: null
    } satisfies PocWebsite;
    wrap(<PocWebsiteFormSheet website={website} open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');
    const trigger = within(dialog).getByRole('combobox', { name: /Customer/ });

    await waitFor(() => expect(trigger).toHaveTextContent('ref1@example.com'));
    expect(getCustomer).toHaveBeenCalledWith('7953');
    expect(trigger).not.toHaveTextContent('7953');
  });
});
