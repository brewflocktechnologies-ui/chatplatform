import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/features/widget-modifier/api/service', () => ({
  getWidgetConfig: vi.fn(),
  getWidgetConfigs: vi.fn()
}));

import { getWidgetConfig } from '@/features/widget-modifier/api/service';
import { WebsitePreviewDialog } from '@/features/websites/components/website-preview-dialog';
import type { Website } from '@/features/websites/api/types';

const base: Website = {
  id: 'w1',
  protocol: 'HTTPS',
  domain: 'example.com',
  companyId: 'co',
  customerId: 'c1',
  customerName: 'Acme',
  flavour: 'Orange',
  businessCategory: 'Saas',
  dateAdded: '2026-01-01',
  isActive: true,
  isVerified: true
};

function renderDialog(website: Website, open = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <WebsitePreviewDialog website={website} open={open} onOpenChange={vi.fn()} />
    </QueryClientProvider>
  );
}

const srcDoc = () =>
  (document.querySelector('iframe') as HTMLIFrameElement).getAttribute('srcdoc')!;

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('WebsitePreviewDialog', () => {
  it('renders the default-config preview when the website has no linked config', async () => {
    renderDialog(base);

    expect(await screen.findByText(/Live Widget Preview: example\.com/)).toBeInTheDocument();
    expect(screen.getByText('Orange')).toBeInTheDocument();
    expect(getWidgetConfig).not.toHaveBeenCalled();
    expect(srcDoc()).toContain('default config');
    expect(srcDoc()).toContain('No saved config linked to this website');
    expect(srcDoc()).toContain('window.cutomizationConfig = {}');
  });

  it('omits the config badge when the website has no flavour or config name', async () => {
    renderDialog({ ...base, flavour: '' });
    await screen.findByText(/Live Widget Preview/);
    expect(screen.queryByText('Orange')).not.toBeInTheDocument();
  });

  it('shows a loading state, then inlines the saved config', async () => {
    let resolve!: (v: unknown) => void;
    vi.mocked(getWidgetConfig).mockReturnValue(new Promise((r) => (resolve = r)) as never);
    renderDialog({ ...base, configId: 'cfg1', configName: 'Brand', flavour: '' });

    expect(await screen.findByText('Loading saved config...')).toBeInTheDocument();
    expect(document.querySelector('iframe')).toBeNull();

    resolve({ id: 'cfg1', name: 'Brand', configName: 'Brand', cdnConfig: { color: 'red' } });

    await waitFor(() => expect(document.querySelector('iframe')).not.toBeNull());
    expect(getWidgetConfig).toHaveBeenCalledWith('cfg1');
    expect(srcDoc()).toContain('"color":"red"');
    expect(srcDoc()).toContain('Live preview — Brand');
    expect(srcDoc()).not.toContain('No saved config linked');
    expect(screen.getByText('Brand')).toBeInTheDocument();
  });

  it('falls back to the flavour label when the config has no name', async () => {
    vi.mocked(getWidgetConfig).mockResolvedValue({
      id: 'cfg1',
      name: '',
      configName: '',
      cdnConfig: { a: 1 }
    });
    renderDialog({ ...base, configId: 'cfg1' });
    await waitFor(() => expect(document.querySelector('iframe')).not.toBeNull());
    await waitFor(() => expect(srcDoc()).toContain('"a":1'));
    expect(srcDoc()).toContain('Live preview — Orange');
  });

  it('uses a generic label when a saved config has no name or flavour', async () => {
    vi.mocked(getWidgetConfig).mockResolvedValue({
      id: 'cfg1',
      name: '',
      configName: '',
      cdnConfig: { a: 1 }
    });
    renderDialog({ ...base, configId: 'cfg1', flavour: '' });
    await waitFor(() => expect(srcDoc()).toContain('linked config'));
  });

  it('renders no iframe while closed', () => {
    renderDialog(base, false);
    expect(document.querySelector('iframe')).toBeNull();
  });
});
