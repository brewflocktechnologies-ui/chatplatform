import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const push = vi.fn();
const logout = vi.fn();
let mockUser: null | { id: string; fullName: string; email: string; imageUrl?: string } = {
  id: '1',
  fullName: 'Zoey Cooper',
  email: 'zoey@mail.com',
  imageUrl: ''
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push })
}));
vi.mock('@/features/auth/mock-auth', () => ({
  useMockAuth: () => ({ user: mockUser, logout })
}));

import { UserNav } from '@/components/layout/user-nav';

beforeEach(() => {
  push.mockClear();
  logout.mockClear();
  mockUser = { id: '1', fullName: 'Zoey Cooper', email: 'zoey@mail.com', imageUrl: '' };
});
afterEach(cleanup);

describe('UserNav', () => {
  it('renders nothing without a user', () => {
    mockUser = null;
    const { container } = render(<UserNav />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the user and menu entries after opening', () => {
    render(<UserNav />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Zoey Cooper')).toBeInTheDocument();
    expect(screen.getByText('zoey@mail.com')).toBeInTheDocument();
    for (const name of ['Profile', 'Billing', 'Settings', 'New Team', 'Sign out']) {
      expect(screen.getByRole('menuitem', { name })).toBeInTheDocument();
    }
  });

  it('navigates to the profile page', () => {
    render(<UserNav />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Profile' }));
    expect(push).toHaveBeenCalledWith('/dashboard/profile');
  });

  it('signs out', () => {
    render(<UserNav />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
