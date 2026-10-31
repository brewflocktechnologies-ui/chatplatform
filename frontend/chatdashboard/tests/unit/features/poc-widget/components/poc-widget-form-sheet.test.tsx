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
import { createPocWidget, updatePocWidget } from '@/features/poc-widget/api/service';
import {
  PocWidgetFormSheet,
  PocWidgetFormSheetTrigger
} from '@/features/poc-widget/components/poc-widget-form-sheet';
import type { PocWidget } from '@/features/poc-widget/api/types';

const widget: PocWidget = {
  id: 9,
  companyId: 11,
  assistantId: 22,
  widgetName: 'Existing widget',
  websiteUrl: 'https://existing.example.com',
  position: 'TOP_LEFT',
  theme: 'DARK',
  primaryColor: '#112233',
  greetingMessage: 'Hi there',
  offlineMessage: null,
  showAgentName: false,
  showTypingIndicator: true,
  enableFileUpload: true,
  maxFileSizeMb: 5,
  enableSoundNotification: false,
  autoPopup: true,
  popupDelaySeconds: 3,
  isActive: false,
  totalImpressions: 0,
  totalConversationsInitiated: 0,
  lastActivityDate: null,
  createdDate: null,
  modifiedDate: null
};

beforeEach(() => {
  vi.clearAllMocks();
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

const submit = (dialog: HTMLElement) => fireEvent.submit(dialog.querySelector('form')!);

describe('PocWidgetFormSheet (create)', () => {
  it('creates a widget with the defaults and trims/normalises optional text', async () => {
    vi.mocked(createPocWidget).mockResolvedValue({ ok: true, data: null });
    const onOpenChange = vi.fn();
    wrap(<PocWidgetFormSheet open onOpenChange={onOpenChange} />);
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByText('New Widget')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/^Widget Name/), {
      target: { value: '  Support widget  ' }
    });
    // Blank optional text is stored as null, not as an empty string.
    fireEvent.change(within(dialog).getByLabelText(/^Greeting Message/), {
      target: { value: '   ' }
    });
    fireEvent.change(within(dialog).getByLabelText(/^Offline Message/), { target: { value: '' } });
    submit(dialog);

    await waitFor(() => expect(createPocWidget).toHaveBeenCalledTimes(1));
    expect(createPocWidget).toHaveBeenCalledWith({
      companyId: 702,
      assistantId: 3902,
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
      isActive: true
    });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Widget created'));
    expect(refresh).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('sends the chosen position, theme, ids and website URL', async () => {
    vi.mocked(createPocWidget).mockResolvedValue({ ok: true, data: null });
    wrap(<PocWidgetFormSheet open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText(/^Widget Name/), { target: { value: 'W' } });
    fireEvent.change(within(dialog).getByLabelText(/^Company ID/), { target: { value: '5' } });
    fireEvent.change(within(dialog).getByLabelText(/^Assistant ID/), { target: { value: '6' } });
    fireEvent.change(within(dialog).getByLabelText(/^Website URL/), {
      target: { value: 'https://site.example.com' }
    });
    await selectOption(within(dialog).getByRole('combobox', { name: /Position/ }), 'Center');
    await selectOption(within(dialog).getByRole('combobox', { name: /Theme/ }), 'Custom');
    submit(dialog);

    await waitFor(() => expect(createPocWidget).toHaveBeenCalledTimes(1));
    expect(createPocWidget).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 5,
        assistantId: 6,
        websiteUrl: 'https://site.example.com',
        position: 'CENTER',
        theme: 'CUSTOM'
      })
    );
  });

  it('only sends a popup delay while auto popup is on', async () => {
    vi.mocked(createPocWidget).mockResolvedValue({ ok: true, data: null });
    wrap(<PocWidgetFormSheet open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Widget Name/), { target: { value: 'W' } });

    expect(within(dialog).queryByLabelText(/Popup Delay/)).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('switch', { name: /Auto popup/ }));
    const delay = await within(dialog).findByLabelText(/Popup Delay/);
    fireEvent.change(delay, { target: { value: '7' } });
    submit(dialog);

    await waitFor(() => expect(createPocWidget).toHaveBeenCalledTimes(1));
    expect(createPocWidget).toHaveBeenCalledWith(
      expect.objectContaining({ autoPopup: true, popupDelaySeconds: 7 })
    );
  });

  it('sends a null delay when auto popup is on but no delay was entered', async () => {
    vi.mocked(createPocWidget).mockResolvedValue({ ok: true, data: null });
    wrap(<PocWidgetFormSheet open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Widget Name/), { target: { value: 'W' } });
    fireEvent.click(within(dialog).getByRole('switch', { name: /Auto popup/ }));
    submit(dialog);

    await waitFor(() => expect(createPocWidget).toHaveBeenCalledTimes(1));
    expect(createPocWidget).toHaveBeenCalledWith(
      expect.objectContaining({ autoPopup: true, popupDelaySeconds: null })
    );
  });

  it('toggles the other switches into the payload', async () => {
    vi.mocked(createPocWidget).mockResolvedValue({ ok: true, data: null });
    wrap(<PocWidgetFormSheet open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Widget Name/), { target: { value: 'W' } });
    for (const name of [
      /Show agent name/,
      /Typing indicator/,
      /File upload/,
      /Sound notification/,
      /^Active/
    ]) {
      fireEvent.click(within(dialog).getByRole('switch', { name }));
    }
    submit(dialog);

    await waitFor(() => expect(createPocWidget).toHaveBeenCalledTimes(1));
    expect(createPocWidget).toHaveBeenCalledWith(
      expect.objectContaining({
        showAgentName: false,
        showTypingIndicator: false,
        enableFileUpload: true,
        enableSoundNotification: false,
        isActive: false
      })
    );
  });

  it('blocks submit with field errors for a blank name and a bad website URL', async () => {
    wrap(<PocWidgetFormSheet open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Website URL/), { target: { value: 'nope' } });
    submit(dialog);

    expect(await within(dialog).findByText('Widget name is required')).toBeInTheDocument();
    expect(createPocWidget).not.toHaveBeenCalled();
  });

  it('requires the ids to be positive whole numbers', async () => {
    wrap(<PocWidgetFormSheet open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Widget Name/), { target: { value: 'W' } });
    fireEvent.change(within(dialog).getByLabelText(/^Company ID/), { target: { value: '0' } });
    fireEvent.change(within(dialog).getByLabelText(/^Assistant ID/), { target: { value: '' } });
    submit(dialog);

    expect(await within(dialog).findByText('Must be positive')).toBeInTheDocument();
    expect(await within(dialog).findByText('Assistant ID is required')).toBeInTheDocument();
    expect(createPocWidget).not.toHaveBeenCalled();
  });

  it('reports the API message and keeps the sheet open when creation fails', async () => {
    vi.mocked(createPocWidget).mockResolvedValue({
      ok: false,
      status: 400,
      message: 'Input validation errors'
    });
    const onOpenChange = vi.fn();
    wrap(<PocWidgetFormSheet open onOpenChange={onOpenChange} />);
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Widget Name/), { target: { value: 'W' } });
    submit(dialog);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Input validation errors'));
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('falls back to a generic message for an unexpected failure', async () => {
    vi.mocked(createPocWidget).mockRejectedValue(new Error('network down'));
    wrap(<PocWidgetFormSheet open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Widget Name/), { target: { value: 'W' } });
    submit(dialog);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't create widget. Try again.")
    );
  });

  it('Cancel closes the sheet without saving', async () => {
    const onOpenChange = vi.fn();
    wrap(<PocWidgetFormSheet open onOpenChange={onOpenChange} />);
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(createPocWidget).not.toHaveBeenCalled();
  });
});

describe('PocWidgetFormSheet (edit)', () => {
  it('prefills from the widget and saves through the update call', async () => {
    vi.mocked(updatePocWidget).mockResolvedValue({ ok: true, data: null });
    const onOpenChange = vi.fn();
    wrap(<PocWidgetFormSheet widget={widget} open onOpenChange={onOpenChange} />);
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByText('Edit Widget')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Widget Name/)).toHaveValue('Existing widget');
    expect(within(dialog).getByLabelText(/^Company ID/)).toHaveValue(11);
    expect(within(dialog).getByLabelText(/Popup Delay/)).toHaveValue(3);
    submit(dialog);

    await waitFor(() => expect(updatePocWidget).toHaveBeenCalledTimes(1));
    expect(createPocWidget).not.toHaveBeenCalled();
    expect(updatePocWidget).toHaveBeenCalledWith(
      9,
      expect.objectContaining({
        widgetName: 'Existing widget',
        websiteUrl: 'https://existing.example.com',
        position: 'TOP_LEFT',
        theme: 'DARK',
        // A stored null prefills with the default text, which is then saved.
        offlineMessage: "We're offline right now. Please leave a message!",
        autoPopup: true,
        popupDelaySeconds: 3,
        isActive: false
      })
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Widget updated'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('reports a failed update', async () => {
    vi.mocked(updatePocWidget).mockRejectedValue(new Error('boom'));
    wrap(<PocWidgetFormSheet widget={widget} open onOpenChange={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');
    submit(dialog);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't update widget. Try again.")
    );
  });

  it('shows the API message when the update is rejected', async () => {
    vi.mocked(updatePocWidget).mockResolvedValue({
      ok: false,
      status: 404,
      message: 'Widget not found'
    });
    wrap(<PocWidgetFormSheet widget={widget} open onOpenChange={vi.fn()} />);
    submit(await screen.findByRole('dialog'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Widget not found'));
  });
});

describe('PocWidgetFormSheetTrigger', () => {
  it('opens the new-widget sheet from the Add Widget button', async () => {
    wrap(<PocWidgetFormSheetTrigger />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Add Widget/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('New Widget')).toBeInTheDocument();
  });
});
