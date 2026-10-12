import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

type KBarAction = { id: string; name: string; section: string; perform: () => void };
let capturedActions: KBarAction[] = [];
const toggle = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());
const setVisualState = vi.hoisted(() => vi.fn());
const stableKBar = vi.hoisted(() => ({
  query: { toggle: null as unknown, setVisualState: null as unknown }
}));

vi.mock('kbar', () => ({
  KBarProvider: ({ actions, children }: { actions: KBarAction[]; children: React.ReactNode }) => {
    capturedActions = actions;
    return <div>{children}</div>;
  },
  KBarPortal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  KBarPositioner: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  KBarAnimator: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  KBarSearch: () => <input />,
  KBarResults: () => null,
  useMatches: () => ({ results: [], rootActionId: null }),
  useRegisterActions: vi.fn(),
  VisualState: { hidden: 'hidden', animatingIn: 'animating-in', showing: 'showing' },
  useKBar: () => stableKBar
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/components/kbar/use-theme-switching', () => ({ default: () => {} }));
vi.mock('@/hooks/use-nav', () => ({
  useFilteredNavGroups: (groups: unknown) => groups
}));
vi.mock('@/config/nav-config', () => ({
  navGroups: [
    {
      label: 'Main',
      items: [
        { title: 'Home', url: '/home', shortcut: ['h'], items: [] },
        { title: 'Bare', url: '/bare' },
        {
          title: 'Container',
          url: '#',
          items: [
            { title: 'Child A', url: '/container/a', shortcut: ['c', 'a'] },
            { title: 'Child B', url: '/container/b' }
          ]
        },
        {
          title: 'Parent',
          url: '/parent',
          items: [{ title: 'Nested', url: '/parent/nested' }]
        }
      ]
    }
  ]
}));

import KBar from '@/components/kbar';

beforeEach(() => {
  stableKBar.query.toggle = toggle;
  stableKBar.query.setVisualState = setVisualState;
  toggle.mockClear();
  setVisualState.mockClear();
  push.mockClear();
  capturedActions = [];
});
afterEach(cleanup);

describe('KBar open signalling', () => {
  it('does not open by default', () => {
    render(
      <KBar>
        <span>page</span>
      </KBar>
    );
    expect(screen.getByText('page')).toBeInTheDocument();
    expect(toggle).not.toHaveBeenCalled();
  });

  it('opens once on mount when asked', () => {
    render(
      <KBar openOnMount>
        <span>page</span>
      </KBar>
    );
    expect(setVisualState).toHaveBeenCalledTimes(1);
    expect(toggle).not.toHaveBeenCalled();
    // Idempotent: only a hidden palette is opened, an open one stays as is.
    const updater = setVisualState.mock.calls[0][0] as (s: string) => string;
    expect(updater('hidden')).toBe('showing');
    expect(updater('animating-in')).toBe('animating-in');
    expect(updater('showing')).toBe('showing');
  });

  it('toggles again on every new nonce', () => {
    const { rerender } = render(
      <KBar openOnMount openNonce={0}>
        <span>page</span>
      </KBar>
    );
    expect(toggle).not.toHaveBeenCalled();
    rerender(
      <KBar openOnMount openNonce={1}>
        <span>page</span>
      </KBar>
    );
    expect(toggle).toHaveBeenCalledTimes(1);
    rerender(
      <KBar openOnMount openNonce={2}>
        <span>page</span>
      </KBar>
    );
    expect(toggle).toHaveBeenCalledTimes(2);
  });
});

describe('KBar actions', () => {
  it('skips container items (url #) but keeps their children, and routes on perform', () => {
    render(
      <KBar>
        <span>page</span>
      </KBar>
    );
    const ids = capturedActions.map((a) => a.id);
    expect(ids).toEqual([
      'homeAction',
      'bareAction',
      'child aAction',
      'child bAction',
      'parentAction',
      'nestedAction'
    ]);
    expect(capturedActions.find((a) => a.id === 'child aAction')!.section).toBe('Container');
    expect(capturedActions.find((a) => a.id === 'homeAction')!.section).toBe('Navigation');

    capturedActions.find((a) => a.id === 'nestedAction')!.perform();
    expect(push).toHaveBeenCalledWith('/parent/nested');
  });
});
