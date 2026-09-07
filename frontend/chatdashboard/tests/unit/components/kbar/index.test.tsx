import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import KBar from '@/components/kbar';
import { navGroups } from '@/config/nav-config';

type KBarAction = {
  id: string;
  name: string;
  section: string;
  subtitle: string;
  perform: () => void;
};

let capturedActions: KBarAction[] = [];

vi.mock('kbar', () => ({
  KBarProvider: ({ actions, children }: { actions: KBarAction[]; children: React.ReactNode }) => {
    capturedActions = actions;
    return <div>{children}</div>;
  },
  KBarPortal: () => null,
  KBarPositioner: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  KBarAnimator: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  KBarSearch: () => <input />,
  KBarResults: () => null,
  useMatches: () => ({ results: [], rootActionId: null }),
  useRegisterActions: vi.fn(),
  useKBar: () => ({ query: { toggle: vi.fn() } })
}));

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push })
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() })
}));

vi.mock('@/components/themes/active-theme', () => ({
  useThemeConfig: () => ({ activeTheme: 'vercel', setActiveTheme: vi.fn() })
}));

vi.mock('@/features/auth/mock-auth', () => ({
  useMockAuth: () => ({
    user: { id: 'demo-user', fullName: 'Demo User', email: 'demo@example.com' },
    isAuthenticated: true,
    isLoaded: true,
    login: vi.fn(),
    logout: vi.fn()
  })
}));

beforeEach(() => {
  capturedActions = [];
  push.mockReset();
});

describe('KBar', () => {
  it('renders its children', () => {
    render(
      <KBar>
        <div data-testid='page-content' />
      </KBar>
    );
    expect(screen.getByTestId('page-content')).toBeInTheDocument();
  });

  it('registers one navigation action per visible nav item', () => {
    render(
      <KBar>
        <div />
      </KBar>
    );
    const navItems = navGroups.flatMap((g) => g.items);
    const navActions = capturedActions.filter((a) => a.section === 'Navigation');
    expect(navActions.map((a) => a.name)).toEqual(navItems.map((i) => i.title));
  });

  it('builds action ids and subtitles from the item title', () => {
    render(
      <KBar>
        <div />
      </KBar>
    );
    const dashboard = capturedActions.find((a) => a.name === 'Dashboard');
    expect(dashboard?.id).toBe('dashboardAction');
    expect(dashboard?.subtitle).toBe('Go to Dashboard');
  });

  it('navigates to the item url when an action performs', () => {
    render(
      <KBar>
        <div />
      </KBar>
    );
    capturedActions.find((a) => a.name === 'AI Chat')?.perform();
    expect(push).toHaveBeenCalledWith('/dashboard/ai-chat');
  });
});
