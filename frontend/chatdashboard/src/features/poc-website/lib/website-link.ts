import type { PocWebsite } from '../api/types';

/** The full URL a website is served from, e.g. `https://example.com`. */
export const websiteLink = (website: Pick<PocWebsite, 'protocol' | 'domain'>) =>
  `${website.protocol.toLowerCase()}://${website.domain}`;

/** Whether a website belongs to the customer (older rows only carry the company link). */
export const belongsToCustomer = (website: PocWebsite, customerId: string) =>
  !!customerId && (website.customerId === customerId || website.companyId === customerId);

/** A config's tenant is the website's company; sites created by the dashboard use the customer. */
export const tenantIdOf = (website: PocWebsite) => website.companyId || website.customerId;
