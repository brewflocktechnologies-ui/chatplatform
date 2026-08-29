'use client';

import { useMockAuth } from '@/features/auth/mock-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Page() {
  const { isAuthenticated } = useMockAuth();
  const router = useRouter();

  useEffect(() => {
    router.replace(isAuthenticated ? '/dashboard/overview' : '/auth/sign-in');
  }, [isAuthenticated, router]);

  return null;
}
