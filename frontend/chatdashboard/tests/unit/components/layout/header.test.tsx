import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Header from '@/components/layout/header';
import { SidebarProvider } from '@/components/ui/sidebar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/customers'
}));

vi.mock('@/components/themes/theme-selector', () => ({
  ThemeSelector: () => <div data-testid='theme-selector' />
}));

vi.mock('@/components/themes/theme-mode-toggle', () => ({
  ThemeModeToggle: () => <div data-testid='theme-mode-toggle' />
}));

vi.mock('@/features/notifications/components/notification-center', () => ({
  NotificationCenter: () => <div data-testid='notification-center' />
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

  it('composes search, theme controls, and notifications', () => {
    renderHeader();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    expect(screen.getByTestId('theme-selector')).toBeInTheDocument();
    expect(screen.getByTestId('theme-mode-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('notification-center')).toBeInTheDocument();
  });
});
