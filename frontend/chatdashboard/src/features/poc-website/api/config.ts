// This POC reads from a different billing deployment than BILLING_API_URL.
const DEFAULT_ORIGIN = 'https://billing-service-iota.vercel.app';

export const pocWebsitesOrigin = () => process.env.POC_WEBSITES_API_URL ?? DEFAULT_ORIGIN;

export const POC_WEBSITES_PATH = '/api/v1/websites';
