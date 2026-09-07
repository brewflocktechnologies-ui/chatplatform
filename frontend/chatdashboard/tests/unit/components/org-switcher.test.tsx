import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrgSwitcher } from '@/components/org-switcher';
import { SidebarProvider } from '@/components/ui/sidebar';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push })
}));

describe('OrgSwitcher', () => {
  it('shows the active organization name', () => {
    render(
      <SidebarProvider>
        <OrgSwitcher />
      </SidebarProvider>
    );
    expect(screen.getByText('Demo Workspace')).toBeInTheDocument();
    expect(screen.getByText('Organization')).toBeInTheDocument();
  });

  it('renders the workspace logo image', () => {
    render(
      <SidebarProvider>
        <OrgSwitcher />
      </SidebarProvider>
    );
    expect(screen.getByRole('img', { name: 'Login' })).toHaveAttribute('src', '/images/Logo.png');
  });
});
