// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

// The SDK is ~400 KiB of client JS (core + browser + react + replay + feedback).
// A top-level `import * as Sentry from '@sentry/nextjs'` puts all of it on the
// critical path of every page — and ships it even when NEXT_PUBLIC_SENTRY_DISABLED
// is set, because the env check only guards the init() call, not the import.
// Loading it dynamically keeps it out of the initial chunks entirely.
//
// Trade-off: errors thrown before the SDK chunk resolves are not captured.
const sentryDisabled = Boolean(process.env.NEXT_PUBLIC_SENTRY_DISABLED);

const sentryReady = sentryDisabled
  ? null
  : import('@sentry/nextjs').then((Sentry) => {
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

// Required by Next.js to instrument router transitions for Sentry tracing.
// The SDK may not have loaded yet on the first transition; those are dropped.
export const onRouterTransitionStart = (...args: unknown[]) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Sentry SDK v10 typing mismatch
  void sentryReady?.then((Sentry) => (Sentry as any).captureRouterTransitionStart?.(...args));
};
