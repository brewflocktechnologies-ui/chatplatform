'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

/**
 * Keeps server-rendered content on screen when a later server refresh fails.
 *
 * The POC pages load their tables on the server, so every `router.refresh()` (after a save, on
 * paging or sorting, or a dev reload) re-runs the API call. When it failed, the page used to
 * swap the table for an error box, which also unmounted any edit form open in a row. Here the
 * last successful content keeps rendering in the same place (so React keeps it mounted, open
 * forms included) and the error shows as a banner above it.
 *
 * Pass the content as children on success and `error` (with no children) on failure.
 */
interface KeepLastGoodProps {
  readonly error?: string;
  readonly children?: React.ReactNode;
}

export function KeepLastGood({ error, children }: Readonly<KeepLastGoodProps>) {
  const router = useRouter();
  const [lastGood, setLastGood] = React.useState<React.ReactNode>(error ? null : children);
  // Remember each successful render (React's "store information from previous renders" pattern).
  if (!error && children !== lastGood) setLastGood(children);

  const retry = () => router.refresh();
  const hasLastGood = lastGood !== null && lastGood !== undefined;

  return (
    <>
      {error && hasLastGood ? (
        <div
          role='alert'
          className='text-muted-foreground mb-4 flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm'
        >
          <span>
            Couldn&apos;t refresh ({error}). Showing the last loaded data.
          </span>
          <Button type='button' variant='outline' size='sm' onClick={retry}>
            Retry
          </Button>
        </div>
      ) : null}
      {error && !hasLastGood ? (
        <div
          role='alert'
          className='text-destructive flex items-center justify-between gap-2 rounded-lg border p-6 text-sm'
        >
          <span>{error}</span>
          <Button type='button' variant='outline' size='sm' onClick={retry}>
            Retry
          </Button>
        </div>
      ) : null}
      {error ? lastGood : children}
    </>
  );
}
