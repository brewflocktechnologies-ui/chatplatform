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
vi.mock('@/features/customers/api/service', () => ({
  getCustomers: vi.fn(),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  deleteCustomer: vi.fn()
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { createWebsite, updateWebsite } from '@/features/websites/api/service';
import { getCustomers } from '@/features/customers/api/service';
import { toast } from 'sonner';
import {
  WebsiteFormSheet,
  WebsiteFormSheetTrigger
} from '@/features/websites/components/website-form-sheet';
import type { Website } from '@/features/websites/api/types';

const website: Website = {
  id: 'w1',
  protocol: 'HTTP',
  domain: 'example.com',
  companyId: 'c1',
  customerId: undefined as unknown as string,
  customerName: 'Old Name',
  flavour: 'Orange',
  businessCategory: 'Saas',
  dateAdded: '2026-01-01',
  isActive: false,
  isVerified: true
};

function wrap(ui: React.ReactNode) {
  client.current = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(<QueryClientProvider client={client.current}>{ui}</QueryClientProvider>);
}

async function selectOption(trigger: HTMLElement, option: string | RegExp) {
  fireEvent.pointerDown(trigger);
  fireEvent.click(trigger);
  const item = await screen.findByRole('option', { name: option });
  fireEvent.pointerDown(item);
  fireEvent.click(item);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCustomers).mockResolvedValue({
    success: true,
    total_customers: 2,
    customers: [
      { id: 'c1', name: 'Acme', email: 'team@acme.com' },
      { id: 'c2', name: 'NoMail', email: '' }
    ]
  } as never);
});
afterEach(cleanup);

async function fillCreate(dialog: HTMLElement) {
  fireEvent.change(within(dialog).getByLabelText(/^Domain/), { target: { value: 'site.io' } });
  await selectOption(within(dialog).getByRole('combobox', { name: /Customer/ }), /Acme/);
  await selectOption(within(dialog).getByRole('combobox', { name: /Business Category/ }), 'Retail');
  fireEvent.change(within(dialog).getByLabelText(/^Flavour/), { target: { value: 'Blue' } });
}

describe('WebsiteFormSheet (create)', () => {
  it('shows create copy, validates, and loads customer options', async () => {
    wrap(<WebsiteFormSheet open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByText('New Website')).toBeInTheDocument();
    expect(getCustomers).toHaveBeenCalledWith({ page: 1, limit: 100 });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create Website' }));
    expect(await within(dialog).findByText('Domain is required')).toBeInTheDocument();
    expect(createWebsite).not.toHaveBeenCalled();

    fireEvent.pointerDown(within(dialog).getByRole('combobox', { name: /Customer/ }));
    fireEvent.click(within(dialog).getByRole('combobox', { name: /Customer/ }));
    expect(await screen.findByRole('option', { name: 'Acme (team@acme.com)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'NoMail' })).toBeInTheDocument();
  });

  it('submits the payload with the selected customer name', async () => {
    vi.mocked(createWebsite).mockResolvedValue({ success: true } as never);
    const onOpenChange = vi.fn();
    wrap(<WebsiteFormSheet open onOpenChange={onOpenChange} />);
    const dialog = await screen.findByRole('dialog');

    await fillCreate(dialog);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create Website' }));

    await waitFor(() => expect(createWebsite).toHaveBeenCalledTimes(1));
    expect(createWebsite).toHaveBeenCalledWith({
      protocol: 'HTTPS',
      domain: 'site.io',
      customerId: 'c1',
      customerName: 'Acme',
      companyId: 'c1',
      businessCategory: 'Retail',
      flavour: 'Blue',
      configName: 'Blue',
      isActive: true,
      isVerified: false
    });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Website created'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('toasts when creation fails', async () => {
    vi.mocked(createWebsite).mockRejectedValue(new Error('boom'));
    wrap(<WebsiteFormSheet open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');

    await fillCreate(dialog);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create Website' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't create website. Try again.")
    );
  });

  it('closes via Cancel', async () => {
    const onOpenChange = vi.fn();
    wrap(<WebsiteFormSheet open onOpenChange={onOpenChange} />);
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not load customers while closed', () => {
    wrap(<WebsiteFormSheet open={false} onOpenChange={vi.fn()} />);
    expect(getCustomers).not.toHaveBeenCalled();
  });
});

describe('WebsiteFormSheet (edit)', () => {
  it('prefills values, falling back to companyId for the owner', async () => {
    wrap(<WebsiteFormSheet website={website} open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByText('Edit Website')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Domain/)).toHaveValue('example.com');
    expect(within(dialog).getByLabelText(/^Flavour/)).toHaveValue('Orange');
    expect(within(dialog).getByRole('switch', { name: /Active/ })).not.toBeChecked();
    expect(within(dialog).getByRole('switch', { name: /Verified/ })).toBeChecked();
  });

  it('updates by id and closes', async () => {
    vi.mocked(updateWebsite).mockResolvedValue({ success: true } as never);
    const onOpenChange = vi.fn();
    wrap(<WebsiteFormSheet website={website} open onOpenChange={onOpenChange} />);
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(getCustomers).toHaveBeenCalled());

    fireEvent.change(within(dialog).getByLabelText(/^Domain/), { target: { value: 'new.io' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Update Website' }));

    await waitFor(() => expect(updateWebsite).toHaveBeenCalledTimes(1));
    expect(updateWebsite).toHaveBeenCalledWith('w1', {
      protocol: 'HTTP',
      domain: 'new.io',
      customerId: 'c1',
      customerName: 'Acme',
      companyId: 'c1',
      businessCategory: 'Saas',
      flavour: 'Orange',
      configName: 'Orange',
      isActive: false,
      isVerified: true
    });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Website updated'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('keeps the stored customer name when the owner is not in the loaded list', async () => {
    vi.mocked(getCustomers).mockResolvedValue({ success: true, customers: [] } as never);
    vi.mocked(updateWebsite).mockResolvedValue({ success: true } as never);
    wrap(
      <WebsiteFormSheet
        website={{ ...website, customerId: 'gone', configName: 'Cfg' }}
        open
        onOpenChange={vi.fn()}
      />
    );
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Update Website' }));

    await waitFor(() => expect(updateWebsite).toHaveBeenCalledTimes(1));
    expect(vi.mocked(updateWebsite).mock.calls[0][1]).toMatchObject({
      customerId: 'gone',
      customerName: 'Old Name',
      flavour: 'Cfg'
    });
  });

  it('falls back to an empty customer name when nothing matches', async () => {
    vi.mocked(getCustomers).mockResolvedValue({ success: true, customers: [] } as never);
    vi.mocked(updateWebsite).mockResolvedValue({ success: true } as never);
    wrap(
      <WebsiteFormSheet
        website={{ ...website, customerId: 'gone', customerName: '' }}
        open
        onOpenChange={vi.fn()}
      />
    );
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Update Website' }));
    await waitFor(() => expect(updateWebsite).toHaveBeenCalledTimes(1));
    expect(vi.mocked(updateWebsite).mock.calls[0][1].customerName).toBe('');
  });

  it('toasts when the update fails', async () => {
    vi.mocked(updateWebsite).mockRejectedValue(new Error('boom'));
    wrap(<WebsiteFormSheet website={website} open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Update Website' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't update website. Try again.")
    );
  });
});

describe('WebsiteFormSheetTrigger', () => {
  it('opens the sheet from the Add Website button', async () => {
    wrap(<WebsiteFormSheetTrigger />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Add Website/ }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
