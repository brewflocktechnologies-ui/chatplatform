// Client-side error reporting that never touches the Sentry SDK unless it is
// actually configured AND an error is reported.
//
// Rationale: a static `import * as Sentry from '@sentry/nextjs'` inside a
// 'use client' error boundary puts the SDK (~65 KB) in the initial chunk of
// every route that loads that boundary, even when no DSN is configured. This
// helper keeps the import behind `import()` so the SDK chunk is only fetched
// when `captureClientError` is actually invoked.
let clientSentry: Promise<typeof import('@sentry/nextjs')> | null = null;

function isSentryEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN) && !process.env.NEXT_PUBLIC_SENTRY_DISABLED;
}

export async function captureClientError(error: Error): Promise<void> {
  if (!isSentryEnabled()) {
    return;
  }
  clientSentry ??= import('@sentry/nextjs');
  const Sentry = await clientSentry;
  Sentry.captureException(error);
}