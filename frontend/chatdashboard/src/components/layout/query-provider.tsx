'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import * as React from 'react';

// The devtools panel is ~100 KiB of JS that only ever renders in development.
// Importing it statically puts it on the critical path of every page load, so
// pull it in lazily and only when NODE_ENV is development.
const ReactQueryDevtools =
  process.env.NODE_ENV === 'development'
    ? React.lazy(() =>
        import('@tanstack/react-query-devtools').then((m) => ({
          default: m.ReactQueryDevtools
        }))
      )
    : null;

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {ReactQueryDevtools ? (
        <React.Suspense fallback={null}>
          <ReactQueryDevtools />
        </React.Suspense>
      ) : null}
    </QueryClientProvider>
  );
}
