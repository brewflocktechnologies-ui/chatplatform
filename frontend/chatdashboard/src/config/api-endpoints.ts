/**
 * Every backend the dashboard calls: which origin serves it and the path of each
 * resource. Services import from here instead of spelling URLs, so a moved
 * endpoint or a new deployment is a one-file change.
 *
 * Origins are functions that read their env var per call, so a missing variable
 * fails the request and not the module import. The origin readers use
 * server-only variables and must run on the server; the same goes for any
 * code that calls them.
 */

// The services below run on serverless hosting; two billing deployments are in play.
const BILLING_DEV_FALLBACK = 'https://billing-service-eta.vercel.app';
const SHARED_BILLING_ORIGIN = 'https://billing-service-iota.vercel.app';

const trimSlashes = (url: string) => url.replace(/\/+$/, '');

export const origins = {
  /** BILLING_API_URL; required in production, falls back to a dev deployment locally. */
  billing: () => {
    const url = process.env.BILLING_API_URL;
    if (url) return trimSlashes(url);
    if (process.env.NODE_ENV === 'production') {
      throw new Error('BILLING_API_URL is not set');
    }
    return BILLING_DEV_FALLBACK;
  },
  /** Customers are served by a different billing deployment than BILLING_API_URL. */
  customers: () => process.env.CUSTOMERS_API_URL ?? SHARED_BILLING_ORIGIN,
  /** The website POC reads from a different billing deployment than BILLING_API_URL. */
  pocWebsites: () => process.env.POC_WEBSITES_API_URL ?? SHARED_BILLING_ORIGIN
} as const;

/** Server actions take client input, so path segments are never spliced in raw. */
const numericId = (id: number) => String(Math.trunc(id));
const opaqueId = (id: string) => encodeURIComponent(id);

export const endpoints = {
  plans: {
    list: '/api/plans',
    active: '/api/plans/active',
    item: (id: number) => `/api/plans/${numericId(id)}`
  },
  companies: {
    list: '/api/v1/companies',
    item: (id: number) => `/api/v1/companies/${numericId(id)}`
  },
  customers: {
    list: '/api/customers',
    item: (id: string) => `/api/customers/${opaqueId(id)}`
  },
  pocWebsites: {
    list: '/api/v1/websites',
    item: (id: string) => `/api/v1/websites/${opaqueId(id)}`
  },
  pocConfigs: {
    list: '/api/v1/widget-configs',
    item: (id: string) => `/api/v1/widget-configs/${opaqueId(id)}`
  },
  pocWidgets: {
    list: '/api/chat-assistant/widgets',
    item: (id: number) => `/api/chat-assistant/widgets/${numericId(id)}`
  }
} as const;

/** Browser-side: the live chat socket. */
export const chatSocketUrl = () => process.env.NEXT_PUBLIC_CHAT_WS_URL || 'ws://localhost:8088';
