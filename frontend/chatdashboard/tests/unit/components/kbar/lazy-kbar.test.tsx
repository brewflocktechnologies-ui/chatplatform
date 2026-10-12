import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

const captured = vi.hoisted(() => ({ loader: null as null | (() => Promise<unknown>) }));

vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<unknown>) => {
    captured.loader = loader;
    return function DynamicKBar(props: {
      openOnMount: boolean;
      openNonce: number;
      children: React.ReactNode;
    }) {
      return (
        <div
          data-testid='kbar'
          data-open-on-mount={String(props.openOnMount)}
          data-nonce={props.openNonce}
        >
          {props.children}
        </div>
      );
    };
  }
}));
vi.mock('@/components/kbar/index', () => ({ default: () => <div data-testid='real-kbar' /> }));

import { LazyKBar } from '@/components/kbar/lazy-kbar';

afterEach(cleanup);

function renderLazy() {
  return render(
    <LazyKBar>
      <span>page</span>
    </LazyKBar>
  );
}

describe('LazyKBar', () => {
  it('renders only the children until triggered', () => {
    renderLazy();
    expect(screen.getByText('page')).toBeInTheDocument();
    expect(screen.queryByTestId('kbar')).not.toBeInTheDocument();
  });

  it('mounts the palette on Ctrl+K and prevents the browser default', () => {
    renderLazy();
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, cancelable: true });
    act(() => {
      window.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    const kbar = screen.getByTestId('kbar');
    expect(kbar).toHaveAttribute('data-open-on-mount', 'true');
    expect(kbar).toHaveAttribute('data-nonce', '0');
    expect(screen.getByText('page')).toBeInTheDocument();
  });

  it('mounts on Cmd+K (uppercase key too)', () => {
    renderLazy();
    act(() => {
      fireEvent.keyDown(window, { key: 'K', metaKey: true });
    });
    expect(screen.getByTestId('kbar')).toBeInTheDocument();
  });

  it('ignores other keys and a bare K', () => {
    renderLazy();
    act(() => {
      fireEvent.keyDown(window, { key: 'k' });
      fireEvent.keyDown(window, { key: 'j', ctrlKey: true });
    });
    expect(screen.queryByTestId('kbar')).not.toBeInTheDocument();
  });

  it('does not bump the nonce for Ctrl+K once mounted (kbar handles it)', () => {
    renderLazy();
    act(() => {
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    });
    act(() => {
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    });
    expect(screen.getByTestId('kbar')).toHaveAttribute('data-nonce', '0');
  });

  it('mounts on the first kbar:open event and toggles on later ones', () => {
    renderLazy();
    act(() => {
      window.dispatchEvent(new Event('kbar:open'));
    });
    expect(screen.getByTestId('kbar')).toHaveAttribute('data-nonce', '0');
    act(() => {
      window.dispatchEvent(new Event('kbar:open'));
    });
    expect(screen.getByTestId('kbar')).toHaveAttribute('data-nonce', '1');
    act(() => {
      window.dispatchEvent(new Event('kbar:open'));
    });
    expect(screen.getByTestId('kbar')).toHaveAttribute('data-nonce', '2');
  });

  it('removes its listeners on unmount', () => {
    const { unmount } = renderLazy();
    unmount();
    act(() => {
      window.dispatchEvent(new Event('kbar:open'));
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    });
    expect(screen.queryByTestId('kbar')).not.toBeInTheDocument();
  });

  it('lazy-loads the KBar module from ./index', async () => {
    const mod = (await captured.loader!()) as { default: unknown };
    expect(typeof mod.default).toBe('function');
  });
});
