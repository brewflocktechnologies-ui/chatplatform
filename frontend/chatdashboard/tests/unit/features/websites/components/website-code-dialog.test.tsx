import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from 'sonner';
import { WebsiteCodeDialog } from '@/features/websites/components/website-code-dialog';
import type { Website } from '@/features/websites/api/types';

const website: Website = {
  id: 'w-123',
  protocol: 'HTTPS',
  domain: 'example.com',
  companyId: 'co',
  customerId: 'c1',
  customerName: 'Acme',
  flavour: 'Orange',
  businessCategory: 'Saas',
  dateAdded: '2026-01-01',
  isActive: true,
  isVerified: true,
};

const writeText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  vi.clearAllMocks();

  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderDialog(open = true, onOpenChange = vi.fn()) {
  const utils = render(
    <WebsiteCodeDialog
      website={website}
      open={open}
      onOpenChange={onOpenChange}
    />,
  );

  return { ...utils, onOpenChange };
}

describe('WebsiteCodeDialog', () => {
  it('shows the embed snippet with the website id on the first step', async () => {
    renderDialog();

    const dialog = await screen.findByRole('dialog');

    expect(
      within(dialog).getByText('Install the chat widget'),
    ).toBeInTheDocument();

    expect(within(dialog).getByText(/example\.com/)).toBeInTheDocument();

    expect(dialog.querySelector('pre')).toHaveTextContent(
      'data-website-id="w-123"',
    );

    expect(
      within(dialog).getByRole('button', { name: /Previous/ }),
    ).toBeDisabled();
  });

  it('copies the snippet and resets the Copied label after 2s', async () => {
    renderDialog();

    const dialog = await screen.findByRole('dialog');

    vi.useFakeTimers({ shouldAdvanceTime: true });

    await act(async () => {
      fireEvent.click(
        within(dialog).getByRole('button', { name: 'Copy' }),
      );

      // Allow the clipboard promise and async handler to settle.
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('data-website-id="w-123"'),
    );

    expect(toast.success).toHaveBeenCalledWith(
      'Code copied to clipboard!',
    );

    expect(
      within(dialog).getByRole('button', { name: 'Copied!' }),
    ).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(
      within(dialog).getByRole('button', { name: 'Copy' }),
    ).toBeInTheDocument();
  });

  it('walks through the steps with Next/Previous and finishes', async () => {
    const { onOpenChange } = renderDialog();

    const dialog = await screen.findByRole('dialog');

    fireEvent.click(
      within(dialog).getByRole('button', { name: /Next/ }),
    );

    expect(
      within(dialog).getByText(/Open the main \.html file/),
    ).toBeInTheDocument();

    expect(dialog.querySelector('pre')).toBeNull();

    expect(
      within(dialog).getByRole('button', { name: /Previous/ }),
    ).toBeEnabled();

    fireEvent.click(
      within(dialog).getByRole('button', { name: /Next/ }),
    );

    fireEvent.click(
      within(dialog).getByRole('button', { name: /Next/ }),
    );

    expect(
      within(dialog).getByText(/Save and publish the page/),
    ).toBeInTheDocument();

    expect(
      within(dialog).queryByRole('button', { name: /Next/ }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      within(dialog).getByRole('button', { name: /Previous/ }),
    );

    expect(
      within(dialog).getByText(/Paste the snippet between/),
    ).toBeInTheDocument();

    fireEvent.click(
      within(dialog).getByRole('button', { name: /Next/ }),
    );

    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Finish' }),
    );

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('jumps to a step by clicking its number or label', async () => {
    renderDialog();

    const dialog = await screen.findByRole('dialog');

    fireEvent.click(
      within(dialog).getByRole('button', { name: '2' }),
    );

    expect(
      within(dialog).getByText(/Open the main/),
    ).toBeInTheDocument();

    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Paste the code' }),
    );

    expect(
      within(dialog).getByText(/Paste the snippet between/),
    ).toBeInTheDocument();

    expect(
      within(dialog).getByRole('button', { name: '3' }),
    ).toHaveAttribute('aria-current', 'step');

    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Get the code' }),
    );

    expect(
      within(dialog).getByText(/Copy the snippet below/),
    ).toBeInTheDocument();
  });

  it('resets to the first step when closed', async () => {
    const { rerender } = renderDialog();

    const dialog = await screen.findByRole('dialog');

    fireEvent.click(
      within(dialog).getByRole('button', { name: /Next/ }),
    );

    rerender(
      <WebsiteCodeDialog
        website={website}
        open={false}
        onOpenChange={vi.fn()}
      />,
    );

    rerender(
      <WebsiteCodeDialog
        website={website}
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(
      await screen.findByText(/Copy the snippet below/),
    ).toBeInTheDocument();
  });
});
