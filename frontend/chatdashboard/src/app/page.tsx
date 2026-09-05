'use client';

import { useMockAuth } from '@/features/auth/mock-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Page() {
  const { isAuthenticated, isLoaded } = useMockAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    router.replace(isAuthenticated ? '/dashboard/overview' : '/auth/sign-in');
  }, [isLoaded, isAuthenticated, router]);

  return null;
}
