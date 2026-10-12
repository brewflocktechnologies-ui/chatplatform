import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useUserStatus } from '@/features/auth/user-status';

let resolvedTheme = 'light';
let mockUser: null | { id: string; fullName?: string; email: string; imageUrl?: string } = null;
const logout = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme, setTheme: vi.fn() })
}));
vi.mock('@/features/auth/mock-auth', () => ({
  useMockAuth: () => ({ user: mockUser, logout })
}));

import { UserDropdown } from '@/components/layout/user-dropdown';

beforeEach(() => {
  resolvedTheme = 'light';
  mockUser = { id: '1', fullName: 'Zoey Cooper', email: 'z@mail.com', imageUrl: '' };
  useUserStatus.setState({ acceptChats: true });
});
afterEach(cleanup);

const open = () => fireEvent.click(screen.getByRole('button', { name: 'User menu' }));

describe('UserDropdown variants', () => {
  it('uses dark styling in dark mode', () => {
    resolvedTheme = 'dark';
    render(<UserDropdown />);
    open();
    expect(screen.getByRole('menu')).toHaveClass('bg-zinc-900', 'text-white');
    expect(screen.getByRole('menuitem', { name: /log out/i })).toHaveClass('text-red-400');
  });

  it('uses light styling in light mode', () => {
    render(<UserDropdown />);
    open();
    expect(screen.getByRole('menu')).toHaveClass('bg-white', 'text-black');
    expect(screen.getByRole('menuitem', { name: /log out/i })).toHaveClass('text-red-500');
  });

  it('falls back to placeholder identity without a user', () => {
    mockUser = null;
    render(<UserDropdown />);
    expect(screen.getAllByText('ZO').length).toBeGreaterThan(0);
    open();
    expect(screen.getByText('zoey')).toBeInTheDocument();
  });

  it('falls back to placeholder initials when the user has no name', () => {
    mockUser = { id: '2', email: 'x@mail.com' };
    render(<UserDropdown />);
    expect(screen.getAllByText('ZO').length).toBeGreaterThan(0);
  });

  it('colours the badge by availability', () => {
    const { container, rerender } = render(<UserDropdown />);
    expect(container.querySelector('[data-slot="avatar-badge"]')).toHaveClass('bg-green-500');
    useUserStatus.setState({ acceptChats: false });
    rerender(<UserDropdown />);
    expect(container.querySelector('[data-slot="avatar-badge"]')).toHaveClass('bg-red-500');
  });

  it('only toggles availability when choosing a different status', () => {
    render(<UserDropdown />);
    open();
    fireEvent.click(screen.getByRole('menuitem', { name: /status/i }));
    // choosing the status we already have is a no-op
    fireEvent.click(screen.getByRole('menuitem', { name: /online/i }));
    expect(useUserStatus.getState().acceptChats).toBe(true);
  });

  it('can switch back from offline to online', () => {
    useUserStatus.setState({ acceptChats: false });
    render(<UserDropdown />);
    open();
    fireEvent.click(screen.getByRole('menuitem', { name: /status/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /online/i }));
    expect(useUserStatus.getState().acceptChats).toBe(true);
  });

  it('applies dark styling to the status submenu', () => {
    resolvedTheme = 'dark';
    render(<UserDropdown />);
    open();
    fireEvent.click(screen.getByRole('menuitem', { name: /status/i }));
    expect(screen.getByRole('menuitem', { name: /offline/i })).toHaveClass('hover:bg-zinc-800');
  });
});
