import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Header from '@/components/layout/header';
import { SidebarProvider } from '@/components/ui/sidebar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/customers'
}));

vi.mock('@/components/themes/theme-mode-toggle', () => ({
  ThemeModeToggle: () => <div data-testid='theme-mode-toggle' />
}));

vi.mock('@/components/layout/fullscreen-toggle', () => ({
  FullscreenToggle: () => <div data-testid='fullscreen-toggle' />
}));

vi.mock('@/components/layout/user-dropdown', () => ({
  UserDropdown: () => <div data-testid='user-dropdown' />
}));

function renderHeader() {
  return render(
    <SidebarProvider>
      <Header />
    </SidebarProvider>
  );
}

describe('Header', () => {
  it('renders as a banner landmark', () => {
    renderHeader();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('shows breadcrumbs for the current route', () => {
    renderHeader();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByText('Customers')).toBeInTheDocument();
  });

  it('includes the sidebar trigger', () => {
    renderHeader();
    expect(screen.getByRole('button', { name: /toggle sidebar/i })).toBeInTheDocument();
  });

  it('composes theme controls, fullscreen, and the user dropdown', () => {
    renderHeader();
    expect(screen.getByTestId('theme-mode-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('fullscreen-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('user-dropdown')).toBeInTheDocument();
  });
});
