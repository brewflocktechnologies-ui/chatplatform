import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AppSidebar from '@/components/layout/app-sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { navGroups } from '@/config/nav-config';
import { useUserStatus } from '@/features/auth/user-status';

const push = vi.fn();
const usePathname = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => usePathname(),
  useRouter: () => ({ push })
}));

let resolvedTheme = 'light';
const setTheme = vi.fn((t: string) => {
  resolvedTheme = t;
});
vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme, setTheme })
}));

const logout = vi.fn();
vi.mock('@/features/auth/mock-auth', () => ({
  useMockAuth: () => ({
    user: {
      id: 'demo-user',
      fullName: 'Demo User',
      email: 'demo@example.com',
      imageUrl: ''
    },
    isAuthenticated: true,
    isLoaded: true,
    login: vi.fn(),
    logout
  })
}));

function renderSidebar() {
  return render(
    <SidebarProvider>
      <AppSidebar />
    </SidebarProvider>
  );
}

beforeEach(() => {
  push.mockReset();
  logout.mockReset();
  usePathname.mockReturnValue('/dashboard/overview');
  resolvedTheme = 'light';
  setTheme.mockClear();
  useUserStatus.setState({ acceptChats: true });
});

function openUserMenu() {
  const trigger = screen.getByRole('button', { name: /demo user/i });
  fireEvent.click(trigger);
}

describe('AppSidebar', () => {
  it('renders a link for every configured nav item', () => {
    renderSidebar();
    for (const item of navGroups.flatMap((g) => g.items)) {
      const link = screen.getByRole('link', { name: item.title });
      expect(link).toHaveAttribute('href', item.url);
    }
  });

  it('renders the group label', () => {
    renderSidebar();
    expect(screen.getByText('Overview')).toBeInTheDocument();
  });

  it('marks only the current route as active', () => {
    usePathname.mockReturnValue('/dashboard/customers');
    renderSidebar();
    const active = screen.getByRole('link', { name: 'Customers' });
    const inactive = screen.getByRole('link', { name: 'Dashboard' });
    expect(active).toHaveAttribute('data-active');
    expect(inactive).not.toHaveAttribute('data-active');
  });

  it('shows the demo organization in the org switcher', () => {
    renderSidebar();
    expect(screen.getByText('Demo Workspace')).toBeInTheDocument();
  });

  it('shows the signed-in user in the footer', () => {
    renderSidebar();
    expect(screen.getByText('Demo User')).toBeInTheDocument();
    expect(screen.getByText('demo@example.com')).toBeInTheDocument();
  });

  it('toggles accepting chats from the footer switch', () => {
    renderSidebar();
    openUserMenu();

    expect(useUserStatus.getState().acceptChats).toBe(true);
    fireEvent.click(screen.getByRole('switch', { name: 'Accept chats' }));
    expect(useUserStatus.getState().acceptChats).toBe(false);
  });

  it('switches to dark mode from the footer switch when light', () => {
    renderSidebar();
    openUserMenu();

    fireEvent.click(screen.getByRole('switch', { name: 'Dark mode' }));
    expect(setTheme).toHaveBeenCalledWith('dark');
  });

  it('switches to light mode from the footer switch when dark', () => {
    resolvedTheme = 'dark';
    renderSidebar();
    openUserMenu();

    fireEvent.click(screen.getByRole('switch', { name: 'Dark mode' }));
    expect(setTheme).toHaveBeenCalledWith('light');
  });

  it('navigates to settings from the footer menu', () => {
    renderSidebar();
    openUserMenu();

    fireEvent.click(screen.getByRole('menuitem', { name: /settings/i }));
    expect(push).toHaveBeenCalledWith('/dashboard/settings');
  });
});
