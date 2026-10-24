import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('@/features/poc-config/api/service', () => ({
  createPocConfig: vi.fn(),
  updatePocConfig: vi.fn(),
  deletePocConfig: vi.fn()
}));
vi.mock('@/features/customers/api/service', () => ({
  getCustomers: vi.fn(),
  getAllCustomers: vi.fn()
}));
vi.mock('@/features/poc-website/api/service', () => ({
  getAllPocWebsites: vi.fn(),
  createPocWebsite: vi.fn(),
  updatePocWebsite: vi.fn(),
  deletePocWebsite: vi.fn()
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { createPocConfig, updatePocConfig } from '@/features/poc-config/api/service';
import { getAllCustomers } from '@/features/customers/api/service';
import { getAllPocWebsites } from '@/features/poc-website/api/service';
import { PocConfigFormSheet } from '@/features/poc-config/components/poc-config-form-sheet';
import type { PocConfig } from '@/features/poc-config/api/types';

const site = (id: string, domain: string, customerId: string, companyId: string) => ({
  id,
  protocol: 'HTTPS',
  domain,
  customerId,
  companyId
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAllCustomers).mockResolvedValue([
    { id: 7953, email: 'ref@example.com' },
    { id: 103, email: 'mode1@example.com' },
    { id: 153, email: 'mode2@example.com' }
  ] as never);
  vi.mocked(getAllPocWebsites).mockResolvedValue([
    site('w-ref', 'ref-test.example.com', '7953', '20452'),
    site('w-a', 'a.example.com', '103', '900'),
    site('w-b', 'b.example.com', '103', '900')
  ] as never);
});
afterEach(cleanup);

function wrap(ui: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

async function pick(trigger: HTMLElement, option: string | RegExp) {
  fireEvent.pointerDown(trigger);
  fireEvent.click(trigger);
  const item = await screen.findByRole('option', { name: option });
  fireEvent.pointerDown(item);
  fireEvent.click(item);
}

const customerBox = (dialog: HTMLElement) =>
  within(dialog).getByRole('combobox', { name: /^Customer/ });
const websiteBox = (dialog: HTMLElement) =>
  within(dialog).getByRole('combobox', { name: /^Website/ });

describe('PocConfigFormSheet linking', () => {
  it('fills client, website, link and tenant from the chosen customer and its only website', async () => {
    vi.mocked(createPocConfig).mockResolvedValue({ ok: true, data: null });
    wrap(<PocConfigFormSheet open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).queryByLabelText(/Client ID/)).not.toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/^Config Name/), {
      target: { value: 'Ref Config' }
    });
    await pick(customerBox(dialog), /ref@example.com/);

    await waitFor(() =>
      expect(websiteBox(dialog)).toHaveTextContent('https://ref-test.example.com')
    );
    expect(within(dialog).getByLabelText(/^Tenant ID/)).toHaveValue('20452');
    expect(within(dialog).getByLabelText(/^Website Link/)).toHaveValue(
      'https://ref-test.example.com'
    );

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create Config' }));
    await waitFor(() => expect(createPocConfig).toHaveBeenCalledTimes(1));
    expect(createPocConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        configName: 'Ref Config',
        clientId: '7953',
        clientName: 'ref@example.com',
        websiteId: 'w-ref',
        websiteLink: 'https://ref-test.example.com',
        tenantId: '20452'
      })
    );
  });

  it('only offers the chosen customer websites and links the one picked', async () => {
    wrap(<PocConfigFormSheet open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');

    await pick(customerBox(dialog), /mode1@example.com/);
    // Two websites: nothing is chosen for the user.
    expect(websiteBox(dialog)).toHaveTextContent('Select website');
    expect(within(dialog).getByLabelText(/^Tenant ID/)).toHaveValue('');

    fireEvent.pointerDown(websiteBox(dialog));
    fireEvent.click(websiteBox(dialog));
    expect(
      await screen.findByRole('option', { name: 'https://a.example.com' })
    ).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'https://b.example.com' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'https://ref-test.example.com' })).toBeNull();
    fireEvent.click(screen.getByRole('option', { name: 'https://b.example.com' }));

    await waitFor(() =>
      expect(within(dialog).getByLabelText(/^Website Link/)).toHaveValue('https://b.example.com')
    );
    expect(within(dialog).getByLabelText(/^Tenant ID/)).toHaveValue('900');
  });

  it('clears the website, link and tenant when the customer changes', async () => {
    wrap(<PocConfigFormSheet open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');

    await pick(customerBox(dialog), /ref@example.com/);
    await waitFor(() => expect(within(dialog).getByLabelText(/^Tenant ID/)).toHaveValue('20452'));

    await pick(customerBox(dialog), /mode2@example.com/);
    await waitFor(() => expect(within(dialog).getByLabelText(/^Tenant ID/)).toHaveValue(''));
    expect(within(dialog).getByLabelText(/^Website Link/)).toHaveValue('');
    expect(websiteBox(dialog)).toHaveTextContent('Select website');
  });

  it('requires a customer and a website', async () => {
    wrap(<PocConfigFormSheet open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create Config' }));

    expect(await within(dialog).findByText('Client ID is required')).toBeInTheDocument();
    expect(within(dialog).getByText('Website ID is required')).toBeInTheDocument();
    expect(createPocConfig).not.toHaveBeenCalled();
  });

  it('does not load customers or websites while closed', () => {
    wrap(<PocConfigFormSheet open={false} onOpenChange={vi.fn()} />);
    expect(getAllCustomers).not.toHaveBeenCalled();
    expect(getAllPocWebsites).not.toHaveBeenCalled();
  });

  it('keeps the saved customer and website on edit even when they are not listed', async () => {
    vi.mocked(updatePocConfig).mockResolvedValue({ ok: true, data: null });
    const config: PocConfig = {
      id: 'cfg-1',
      configName: 'Old',
      clientId: '999',
      clientName: 'gone@example.com',
      websiteId: 'w-gone',
      websiteLink: 'https://gone.example.com',
      tenantId: 't-1',
      cdnConfig: '{}',
      createdAt: null,
      updatedAt: null,
      createdBy: 'me',
      updatedBy: 'me',
      version: 3,
      new: false
    };
    wrap(<PocConfigFormSheet config={config} open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');

    expect(customerBox(dialog)).toHaveTextContent('gone@example.com');
    expect(websiteBox(dialog)).toHaveTextContent('https://gone.example.com');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Update Config' }));
    await waitFor(() => expect(updatePocConfig).toHaveBeenCalledTimes(1));
    expect(vi.mocked(updatePocConfig).mock.calls[0][1]).toMatchObject({
      clientId: '999',
      clientName: 'gone@example.com',
      websiteId: 'w-gone',
      websiteLink: 'https://gone.example.com',
      tenantId: 't-1'
    });
  });
});
