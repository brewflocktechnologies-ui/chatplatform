import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const push = vi.fn();
let isMobile = false;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push })
}));
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />
}));
vi.mock('@/components/ui/sidebar', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/ui/sidebar')>();
  return {
    ...actual,
    useSidebar: () => ({ ...actual.useSidebar(), isMobile })
  };
});

import { OrgSwitcher } from '@/components/org-switcher';
import { SidebarProvider } from '@/components/ui/sidebar';

function renderSwitcher() {
  return render(
    <SidebarProvider>
      <OrgSwitcher />
    </SidebarProvider>
  );
}

beforeEach(() => {
  push.mockClear();
  isMobile = false;
});
afterEach(cleanup);

describe('OrgSwitcher menu', () => {
  it('lists the organizations and an add action when opened', () => {
    renderSwitcher();
    fireEvent.click(screen.getByRole('button', { name: /Demo Workspace/ }));
    expect(screen.getByText('Organizations')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Demo Workspace/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Add organization/ })).toBeInTheDocument();
  });

  it('opens the workspaces page when the organization is chosen', () => {
    renderSwitcher();
    fireEvent.click(screen.getByRole('button', { name: /Demo Workspace/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Demo Workspace/ }));
    expect(push).toHaveBeenCalledWith('/dashboard/workspaces');
  });

  it('opens the workspaces page for Add organization', () => {
    renderSwitcher();
    fireEvent.click(screen.getByRole('button', { name: /Demo Workspace/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Add organization/ }));
    expect(push).toHaveBeenCalledWith('/dashboard/workspaces');
  });

  it('opens the menu below the trigger on mobile', () => {
    isMobile = true;
    renderSwitcher();
    fireEvent.click(screen.getByRole('button', { name: /Demo Workspace/ }));
    expect(screen.getByText('Organizations')).toBeInTheDocument();
  });
});
