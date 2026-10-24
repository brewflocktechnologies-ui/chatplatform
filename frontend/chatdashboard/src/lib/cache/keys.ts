/**
 * Root query key of every cached entity. Feature key factories build on these
 * (`[...entityRoots.customers, 'list', filters]`), and invalidation goes through
 * `invalidateEntity`, so no file spells a root key as a string literal.
 *
 * `websites` is the MongoDB collection; `pocWebsites` is the billing API's
 * /api/v1/websites. They are different data sources, so they stay separate caches.
 */
export const entityRoots = {
  plans: ['plans'],
  customers: ['customers'],
  companies: ['companies'],
  websites: ['websites'],
  pocWebsites: ['poc-websites'],
  widgetConfigs: ['widget-configs'],
  products: ['products']
} as const;

export type Entity = keyof typeof entityRoots;
