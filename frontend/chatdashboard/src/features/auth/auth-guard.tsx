'use client';

import { useMockAuth } from './mock-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useMockAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.replace('/auth/sign-in');
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;
  return <>{children}</>;
}
