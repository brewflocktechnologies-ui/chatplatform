import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';

const { replace, auth } = vi.hoisted(() => ({
  replace: vi.fn(),
  auth: { isAuthenticated: false, isLoaded: false }
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
vi.mock('@/features/auth/mock-auth', () => ({ useMockAuth: () => auth }));

import { AuthGuard } from '@/features/auth/auth-guard';

describe('AuthGuard', () => {
  afterEach(() => {
    cleanup();
    replace.mockReset();
  });

  it('renders nothing and does not redirect while loading', () => {
    auth.isLoaded = false;
    auth.isAuthenticated = false;
    const { container } = render(<AuthGuard>secret</AuthGuard>);
    expect(container).toBeEmptyDOMElement();
    expect(replace).not.toHaveBeenCalled();
  });

  it('redirects to sign-in when loaded but unauthenticated', () => {
    auth.isLoaded = true;
    auth.isAuthenticated = false;
    const { container } = render(<AuthGuard>secret</AuthGuard>);
    expect(container).toBeEmptyDOMElement();
    expect(replace).toHaveBeenCalledWith('/auth/sign-in');
  });

  it('renders children when authenticated', () => {
    auth.isLoaded = true;
    auth.isAuthenticated = true;
    render(<AuthGuard>secret</AuthGuard>);
    expect(screen.getByText('secret')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
