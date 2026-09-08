import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import * as React from 'react';
import { MockAuthProvider, useMockAuth, DEMO_USER } from '@/features/auth/mock-auth';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push })
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MockAuthProvider>{children}</MockAuthProvider>
);

beforeEach(() => {
  push.mockReset();
  localStorage.clear();
});

describe('useMockAuth', () => {
  it('throws when used outside the provider', () => {
    expect(() => renderHook(() => useMockAuth())).toThrow(
      'useMockAuth must be used within a MockAuthProvider'
    );
  });

  it('starts unauthenticated and becomes loaded', async () => {
    const { result } = renderHook(() => useMockAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('restores the user from localStorage', async () => {
    localStorage.setItem('mock_auth_user', JSON.stringify(DEMO_USER));
    const { result } = renderHook(() => useMockAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.user?.fullName).toBe(DEMO_USER.fullName);
  });

  it('ignores malformed localStorage content', async () => {
    localStorage.setItem('mock_auth_user', '{not json');
    const { result } = renderHook(() => useMockAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.user).toBeNull();
  });

  it('login stores the user and navigates to the overview', async () => {
    const { result } = renderHook(() => useMockAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    act(() => result.current.login('  Jane Doe  '));
    expect(result.current.user?.fullName).toBe('Jane Doe');
    expect(JSON.parse(localStorage.getItem('mock_auth_user')!).fullName).toBe('Jane Doe');
    expect(push).toHaveBeenCalledWith('/dashboard/overview');
  });

  it('login falls back to the demo name when none is given', async () => {
    const { result } = renderHook(() => useMockAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    act(() => result.current.login('   '));
    expect(result.current.user?.fullName).toBe(DEMO_USER.fullName);
  });

  it('logout clears the user and navigates to sign-in', async () => {
    localStorage.setItem('mock_auth_user', JSON.stringify(DEMO_USER));
    const { result } = renderHook(() => useMockAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    act(() => result.current.logout());
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('mock_auth_user')).toBeNull();
    expect(push).toHaveBeenCalledWith('/auth/sign-in');
  });
});
