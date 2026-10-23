// Customers are served by a different billing deployment than BILLING_API_URL.
const DEFAULT_ORIGIN = 'https://billing-service-iota.vercel.app';

export const customersOrigin = () => process.env.CUSTOMERS_API_URL ?? DEFAULT_ORIGIN;

export const CUSTOMERS_PATH = '/api/customers';
