// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

// The SDK is ~400-500 KiB of client JS (core + browser + react + replay + feedback).
// A top-level `import * as Sentry from '@sentry/nextjs'` — or even a top-level
// `import()` — starts fetching and executing it during the load window of every
// page, contributing bytes and main-thread time to performance audits even on
// pages that never report an error.
//
// So the import is deferred twice over:
//   1. It only fires when a DSN is actually configured (and not disabled).
//   2. It only fires after the page has reached load + the browser is idle, so
//      the SDK never executes inside the load window. Errors before the first
//      idle moment are not captured client-side — the accepted trade-off.
const sentryEnabled =
  !process.env.NEXT_PUBLIC_SENTRY_DISABLED && Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);

let sentryReady: Promise<typeof import('@sentry/nextjs')> | null = null;

function initSentry(): Promise<typeof import('@sentry/nextjs')> {
  sentryReady ??= import('@sentry/nextjs').then((Sentry) => {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

      // Adds request headers and IP for users, for more info visit
      sendDefaultPii: true,

      // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
      tracesSampleRate: 1,

      // Setting this option to true will print useful information to the console while you're setting up Sentry.
      debug: false
    });
    return Sentry;
  });
  return sentryReady;
}

// Required by Next.js to instrument router transitions for Sentry tracing.
// The SDK may not have loaded yet on the first transitions; those are dropped.
export const onRouterTransitionStart = (...args: unknown[]) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Sentry SDK v10 typing mismatch
  void sentryReady?.then((Sentry) => (Sentry as any).captureRouterTransitionStart?.(...args));
};

if (typeof window !== 'undefined' && sentryEnabled) {
  const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 5000));
  const schedule = () => idle(() => void initSentry());
  if (document.readyState === 'complete') {
    schedule();
  } else {
    window.addEventListener('load', schedule, { once: true });
  }
}