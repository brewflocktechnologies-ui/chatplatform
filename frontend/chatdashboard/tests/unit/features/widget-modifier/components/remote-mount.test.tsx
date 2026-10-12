import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const h = vi.hoisted(() => ({
  remote: { mod: null as any, error: null as Error | null },
  env: { current: 'local' as 'local' | 'prod' },
  setEnv: vi.fn()
}));

vi.mock('@/features/widget-modifier/lib/federation', () => ({
  useViteRemote: () => h.remote
}));
vi.mock('@/config/external-urls', () => ({
  getWidgetCustomizationMfeUrl: () => 'http://mfe',
  getActiveWidgetEnv: () => h.env.current,
  setActiveWidgetEnv: (e: string) => h.setEnv(e)
}));

import { RemoteMount } from '@/features/widget-modifier/components/remote-mount';

const props = { websiteId: 'w1', customerId: 'c1', domain: 'a.com' };
const reload = vi.fn();
const originalLocation = window.location;

beforeEach(() => {
  h.remote = { mod: null, error: null };
  h.env.current = 'local';
  h.setEnv.mockReset();
  reload.mockReset();
  Object.defineProperty(window, 'location', {
    value: { ...originalLocation, reload },
    configurable: true
  });
});
afterEach(() => {
  cleanup();
  Object.defineProperty(window, 'location', { value: originalLocation, configurable: true });
});

describe('RemoteMount', () => {
  it('shows a loading indicator until the module is available', () => {
    render(<RemoteMount {...props} />);
    expect(screen.getByText('Loading customization UI...')).toBeInTheDocument();
  });

  it('mounts the module into the container and unmounts on cleanup', async () => {
    const mount = vi.fn().mockResolvedValue(undefined);
    const unmount = vi.fn();
    h.remote = { mod: { mount, unmount }, error: null };
    const { container, unmount: unmountView } = render(<RemoteMount {...props} />);
    const el = container.firstElementChild as HTMLElement;
    await waitFor(() => expect(mount).toHaveBeenCalledWith(el, props));
    unmountView();
    expect(unmount).toHaveBeenCalledWith(el);
  });

  it('logs mount failures and tolerates missing or throwing unmount', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mount = vi.fn().mockRejectedValue(new Error('boom'));
    h.remote = {
      mod: {
        mount,
        unmount: () => {
          throw new Error('gone');
        }
      },
      error: null
    };
    const view = render(<RemoteMount {...props} />);
    await waitFor(() =>
      expect(err).toHaveBeenCalledWith('Failed to mount customization widget:', expect.any(Error))
    );
    expect(() => view.unmount()).not.toThrow();

    h.remote = { mod: { mount: vi.fn() }, error: null };
    const view2 = render(<RemoteMount {...props} />);
    expect(() => view2.unmount()).not.toThrow();
    err.mockRestore();
  });

  it('clears a stale mounted flag before mounting', async () => {
    const mount = vi.fn();
    h.remote = { mod: { mount }, error: null };
    render(<RemoteMount {...props} />);
    await waitFor(() => expect(mount).toHaveBeenCalled());
    const el = mount.mock.calls[0][0] as HTMLElement;
    expect(el.dataset.cwMounted).toBeUndefined();
  });

  it('shows the local error state, switches to prod and retries', () => {
    h.remote = { mod: null, error: new Error('load failed') };
    render(<RemoteMount {...props} />);
    expect(screen.getByText(/Local: port 5001/)).toBeInTheDocument();
    expect(screen.getByText('load failed')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Production CDN' }));
    expect(h.setEnv).toHaveBeenCalledWith('prod');
    expect(reload).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('shows the production error state and offers switching to local', () => {
    h.env.current = 'prod';
    h.remote = { mod: null, error: new Error('cdn down') };
    render(<RemoteMount {...props} />);
    expect(screen.getByText(/Production CDN\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Local (port 5001)' }));
    expect(h.setEnv).toHaveBeenCalledWith('local');
  });
});
