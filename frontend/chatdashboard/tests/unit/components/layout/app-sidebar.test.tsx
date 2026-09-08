import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AppSidebar from '@/components/layout/app-sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { navGroups } from '@/config/nav-config';

const push = vi.fn();
const usePathname = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => usePathname(),
  useRouter: () => ({ push })
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
});

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
});
