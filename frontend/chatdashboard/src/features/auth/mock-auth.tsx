'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

export interface MockUser {
  id: string;
  fullName: string;
  email: string;
  imageUrl?: string;
}

const STORAGE_KEY = 'mock_auth_user';

export const DEMO_USER: MockUser = {
  id: 'demo-user',
  fullName: 'Demo User',
  email: 'demo@example.com',
  imageUrl: ''
};

interface MockAuthContextValue {
  user: MockUser | null;
  isAuthenticated: boolean;
  login: (name?: string) => void;
  logout: () => void;
}

const MockAuthContext = React.createContext<MockAuthContextValue | null>(null);

export function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<MockUser | null>(null);
  const router = useRouter();

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw) as MockUser);
    } catch {
      // ignore malformed storage
    }
  }, []);

  const login = React.useCallback(
    (name?: string) => {
      const nextUser: MockUser = {
        ...DEMO_USER,
        fullName: name && name.trim() ? name.trim() : DEMO_USER.fullName
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
      setUser(nextUser);
      router.push('/dashboard/overview');
    },
    [router]
  );

  const logout = React.useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    router.push('/auth/sign-in');
  }, [router]);

  const value = React.useMemo<MockAuthContextValue>(
    () => ({ user, isAuthenticated: !!user, login, logout }),
    [user, login, logout]
  );

  return <MockAuthContext.Provider value={value}>{children}</MockAuthContext.Provider>;
}

export function useMockAuth(): MockAuthContextValue {
  const ctx = React.useContext(MockAuthContext);
  if (!ctx) {
    throw new Error('useMockAuth must be used within a MockAuthProvider');
  }
  return ctx;
}
