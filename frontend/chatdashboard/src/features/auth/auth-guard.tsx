'use client';

import { useMockAuth } from './mock-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function AuthGuard({
  children,
  signedInHint = false
}: Readonly<{
  children: React.ReactNode;
  /** The server saw the signed-in cookie: render the page now instead of after hydration. */
  signedInHint?: boolean;
}>) {
  const { isAuthenticated, isLoaded } = useMockAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isAuthenticated) {
      router.replace('/auth/sign-in');
    }
  }, [isLoaded, isAuthenticated, router]);

  // Before the stored session is read, trust the hint so the server HTML (and first paint) has the
  // page; once loaded, the stored session decides and a stale hint redirects to sign-in.
  if (!isLoaded) return signedInHint ? <>{children}</> : null;
  if (!isAuthenticated) return null;
  return <>{children}</>;
}
