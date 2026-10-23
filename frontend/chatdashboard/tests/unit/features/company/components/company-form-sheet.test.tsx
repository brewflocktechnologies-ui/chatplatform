import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { client } = vi.hoisted(() => ({
  client: { current: null as unknown as import('@tanstack/react-query').QueryClient }
}));
vi.mock('@/lib/query-client', () => ({ getQueryClient: () => client.current }));
vi.mock('@/features/company/api/service', () => ({
  getCompanies: vi.fn(),
  getAllCompanies: vi.fn(),
  createCompany: vi.fn(),
  updateCompany: vi.fn(),
  deleteCompany: vi.fn()
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { createCompany, updateCompany } from '@/features/company/api/service';
import { toast } from 'sonner';
import {
  CompanyFormSheet,
  CompanyFormSheetTrigger
} from '@/features/company/components/company-form-sheet';
import { makeCompany } from '../fixtures';

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

describe('CompanyFormSheet (create)', () => {
  it('shows create copy and validates the name', async () => {
    wrap(<CompanyFormSheet open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByText('New Company')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create Company' }));

    expect(
      await within(dialog).findByText('Name must be at least 2 characters')
    ).toBeInTheDocument();
    expect(createCompany).not.toHaveBeenCalled();
  });

  it('rejects an invalid email', async () => {
    wrap(<CompanyFormSheet open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');

    type(dialog, /^Name/, 'Acme');
    type(dialog, /Contact Email/, 'nope');
    // jsdom's native type=email validation would block a button click before Zod runs.
    fireEvent.submit(dialog.querySelector('form')!);

    expect(await within(dialog).findByText('Please enter a valid email')).toBeInTheDocument();
    expect(createCompany).not.toHaveBeenCalled();
  });

  it('sends blank fields as null, then toasts, invalidates and closes', async () => {
    vi.mocked(createCompany).mockResolvedValue({ ok: true, data: makeCompany() });
    const onOpenChange = vi.fn();
    wrap(<CompanyFormSheet open onOpenChange={onOpenChange} />);
    const invalidate = vi.spyOn(client.current, 'invalidateQueries');
    const dialog = await screen.findByRole('dialog');

    type(dialog, /^Name/, '  Acme  ');
    type(dialog, /Contact Email/, 'hi@acme.com');
    type(dialog, /Employees/, '50');
    type(dialog, /^City/, 'Pune');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create Company' }));

    await waitFor(() => expect(createCompany).toHaveBeenCalledTimes(1));
    expect(createCompany).toHaveBeenCalledWith({
      name: 'Acme',
      companyDetails: {
        contactEmail: 'hi@acme.com',
        contactPhone: null,
        website: null,
        industry: null,
        employeeCount: 50
      },
      headquarters: {
        streetAddress: null,
        city: 'Pune',
        state: null,
        postalCode: null,
        country: null
      },
      customPlanIds: [],
      customerIds: []
    });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Company created'));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['companies'] });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('toasts the API message when creation fails and stays open', async () => {
    vi.mocked(createCompany).mockResolvedValue({
      ok: false,
      status: 400,
      message: 'Name already taken'
    });
    const onOpenChange = vi.fn();
    wrap(<CompanyFormSheet open onOpenChange={onOpenChange} />);
    const dialog = await screen.findByRole('dialog');

    type(dialog, /^Name/, 'Acme');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create Company' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Name already taken'));
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('uses a generic message for unexpected errors', async () => {
    vi.mocked(createCompany).mockRejectedValue(new Error('network'));
    wrap(<CompanyFormSheet open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');

    type(dialog, /^Name/, 'Acme');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create Company' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't create company. Try again.")
    );
  });

  it('closes from the Cancel button', async () => {
    const onOpenChange = vi.fn();
    wrap(<CompanyFormSheet open onOpenChange={onOpenChange} />);
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('CompanyFormSheet (edit)', () => {
  const company = makeCompany({ id: 12, customPlanIds: [5], customerIds: [8, 9] });

  it('prefills the form from the company', async () => {
    wrap(<CompanyFormSheet company={company} open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByText('Edit Company')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Name/)).toHaveValue('Acme Corp');
    expect(within(dialog).getByLabelText(/Contact Email/)).toHaveValue('hello@acme.com');
    expect(within(dialog).getByLabelText(/Employees/)).toHaveValue(1200);
    expect(within(dialog).getByLabelText(/^City/)).toHaveValue('Bengaluru');
  });

  it('keeps plan and customer links when updating', async () => {
    vi.mocked(updateCompany).mockResolvedValue({ ok: true, data: company });
    const onOpenChange = vi.fn();
    wrap(<CompanyFormSheet company={company} open onOpenChange={onOpenChange} />);
    const dialog = await screen.findByRole('dialog');

    type(dialog, /^Name/, 'Acme Renamed');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Update Company' }));

    await waitFor(() => expect(updateCompany).toHaveBeenCalledTimes(1));
    const [id, payload] = vi.mocked(updateCompany).mock.calls[0];
    expect(id).toBe(12);
    expect(payload).toMatchObject({
      name: 'Acme Renamed',
      customPlanIds: [5],
      customerIds: [8, 9]
    });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Company updated'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('toasts when the update fails', async () => {
    vi.mocked(updateCompany).mockRejectedValue(new Error('network'));
    wrap(<CompanyFormSheet company={company} open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Update Company' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't update company. Try again.")
    );
  });
});

describe('CompanyFormSheetTrigger', () => {
  it('opens the create sheet from the Add Company button', async () => {
    wrap(<CompanyFormSheetTrigger />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Add Company/ }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('New Company')).toBeInTheDocument();
  });
});
