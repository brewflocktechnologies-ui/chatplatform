import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const h = vi.hoisted(() => ({
  user: null as null | { fullName: string; email: string },
  success: vi.fn()
}));

vi.mock('@/features/auth/mock-auth', () => ({ useMockAuth: () => ({ user: h.user }) }));
vi.mock('sonner', () => ({ toast: { success: h.success } }));

import ProfileViewPage from '@/features/profile/components/profile-view-page';

beforeEach(() => {
  h.success.mockReset();
  h.user = { fullName: 'Jane Doe', email: 'jane@example.com' };
});
afterEach(() => cleanup());

describe('ProfileViewPage', () => {
  it('renders nothing without a user', () => {
    h.user = null;
    const { container } = render(<ProfileViewPage />);
    expect(container).toBeEmptyDOMElement();
  });

  it('prefills the form from the user and saves', async () => {
    render(<ProfileViewPage />);
    expect(screen.getByPlaceholderText('Your name')).toHaveValue('Jane Doe');
    expect(screen.getByPlaceholderText('you@example.com')).toHaveValue('jane@example.com');
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Janet' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(h.success).toHaveBeenCalledWith('Profile updated (demo): Janet'));
  });

  it('shows validation errors for empty name and invalid email', async () => {
    render(<ProfileViewPage />);
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: '' } });
    const email = screen.getByPlaceholderText('you@example.com');
    fireEvent.change(email, { target: { value: 'bad' } });
    fireEvent.submit(email.closest('form')!);
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(h.success).not.toHaveBeenCalled();
  });
});
