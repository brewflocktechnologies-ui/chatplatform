import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { UserDropdown } from '@/components/layout/user-dropdown';
import { useUserStatus } from '@/features/auth/user-status';

const push = vi.fn();
const logout = vi.fn();

let resolvedTheme = 'light';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push })
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme, setTheme: vi.fn() })
}));

vi.mock('@/features/auth/mock-auth', () => ({
  useMockAuth: () => ({
    user: { id: '1', fullName: 'Zoey Cooper', email: 'zoey@mail.com', imageUrl: '' },
    isAuthenticated: true,
    isLoaded: true,
    login: vi.fn(),
    logout
  })
}));

describe('UserDropdown', () => {
  beforeEach(() => {
    resolvedTheme = 'light';
    push.mockClear();
    logout.mockClear();
    useUserStatus.setState({ acceptChats: true });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders nothing when no resolved theme is available', () => {
    resolvedTheme = '';
    const { container } = render(<UserDropdown />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the avatar trigger with the users initials', () => {
    render(<UserDropdown />);
    expect(screen.getByRole('button', { name: 'User menu' })).toBeInTheDocument();
    expect(screen.getByText('ZO')).toBeInTheDocument();
  });

  it('opens the menu and shows the signed-in profile, actions and logout', async () => {
    render(<UserDropdown />);
    fireEvent.click(screen.getByRole('button', { name: 'User menu' }));

    expect(screen.getByText('Signed in as')).toBeInTheDocument();
    expect(screen.getByText('Zoey Cooper')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /my profile/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /status/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /log out/i })).toBeInTheDocument();
  });

  it('navigates to the profile page when My Profile is clicked', () => {
    render(<UserDropdown />);
    fireEvent.click(screen.getByRole('button', { name: 'User menu' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /my profile/i }));

    expect(push).toHaveBeenCalledWith('/dashboard/profile');
  });

  it('toggles accepting chats via the Status submenu', () => {
    render(<UserDropdown />);
    fireEvent.click(screen.getByRole('button', { name: 'User menu' }));
    expect(useUserStatus.getState().acceptChats).toBe(true);

    const statusTrigger = screen.getByRole('menuitem', { name: /status/i });
    fireEvent.click(statusTrigger);
    fireEvent.click(screen.getByRole('menuitem', { name: /offline/i }));

    expect(useUserStatus.getState().acceptChats).toBe(false);
  });

  it('logs out when Log Out is clicked', () => {
    render(<UserDropdown />);
    fireEvent.click(screen.getByRole('button', { name: 'User menu' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /log out/i }));

    expect(logout).toHaveBeenCalledTimes(1);
  });
});