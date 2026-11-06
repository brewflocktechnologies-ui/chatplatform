'use client';

import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { StatsErrorAlert } from '@/features/overview/components/stats-error';
import { useRouter } from 'next/navigation';
import { useEffect, useTransition } from 'react';
import { captureClientError } from '@/lib/sentry';

interface StatsErrorBoundaryProps {
  error: Error;
  reset: () => void;
  /** What failed to load, e.g. "area statistics". */
  subject: string;
}

// Shared body of the overview error.tsx route files: reports the error, shows it, and
// offers a retry that refreshes the route and resets the boundary.
export function StatsErrorBoundary({ error, reset, subject }: Readonly<StatsErrorBoundaryProps>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    void captureClientError(error);
  }, [error]);

  // Defer the refresh until the next render phase so React settles pending states first
  const retry = () => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  return (
    <StatsErrorAlert
      message={`Failed to load ${subject}: ${error.message}`}
      action={
        <>
          <Button variant='outline' size='sm' onClick={retry} disabled={isPending}>
            {isPending ? (
              <>
                <Icons.spinner className='mr-2 h-4 w-4 animate-spin' aria-hidden='true' />
                Retrying...
              </>
            ) : (
              'Try again'
            )}
          </Button>
          <span role='status' aria-live='polite' className='sr-only'>
            {isPending ? 'Retrying' : ''}
          </span>
        </>
      }
    />
  );
}
