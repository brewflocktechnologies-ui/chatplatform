import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const push = vi.fn();
const logout = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/parent/child-a',
  useRouter: () => ({ push })
}));
vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() })
}));
vi.mock('@/features/auth/mock-auth', () => ({
  useMockAuth: () => ({
    user: { id: '1', fullName: 'Demo User', email: 'demo@example.com', imageUrl: '' },
    isAuthenticated: true,
    isLoaded: true,
    login: vi.fn(),
    logout
  })
}));
vi.mock('@/config/nav-config', () => ({
  navGroups: [
    {
      label: '',
      items: [
        {
          title: 'Parent',
          url: '/dashboard/parent',
          icon: 'dashboard',
          isActive: true,
          items: [
            { title: 'Child A', url: '/dashboard/parent/child-a' },
            { title: 'Child B', url: '/dashboard/parent/child-b' }
          ]
        },
        { title: 'Iconless', url: '/dashboard/iconless', items: [] }
      ]
    }
  ]
}));

import AppSidebar from '@/components/layout/app-sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

function renderSidebar() {
  return render(
    <SidebarProvider>
      <AppSidebar />
    </SidebarProvider>
  );
}

beforeEach(() => {
  push.mockClear();
  logout.mockClear();
});
afterEach(cleanup);

describe('AppSidebar nested items', () => {
  it('renders a collapsible group (open because isActive) with sub links', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: 'Child A' })).toHaveAttribute(
      'href',
      '/dashboard/parent/child-a'
    );
    expect(screen.getByRole('link', { name: 'Child B' })).toHaveAttribute(
      'href',
      '/dashboard/parent/child-b'
    );
    // the active sub item is flagged
    expect(screen.getByRole('link', { name: 'Child A' })).toHaveAttribute('data-active');
    expect(screen.getByRole('link', { name: 'Child B' })).not.toHaveAttribute('data-active');
  });

  it('collapses and re-expands the group from its trigger', () => {
    renderSidebar();
    const trigger = screen.getByRole('button', { name: /^Parent/ });
    fireEvent.click(trigger);
    expect(screen.queryByRole('link', { name: 'Child A' })).not.toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.getByRole('link', { name: 'Child A' })).toBeInTheDocument();
  });

  it('falls back to the logo icon for items without an icon and has no group label', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: 'Iconless' })).toBeInTheDocument();
    expect(screen.queryByText('Overview')).not.toBeInTheDocument();
  });

  it.each([
    ['Profile', '/dashboard/profile'],
    ['Billing', '/dashboard/billing'],
    ['Notifications', '/dashboard/notifications']
  ])('navigates to %s from the footer menu', (name, url) => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /demo user/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: new RegExp(name, 'i') }));
    expect(push).toHaveBeenCalledWith(url);
  });

  it('signs out from the footer menu', () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /demo user/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /sign out/i }));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
