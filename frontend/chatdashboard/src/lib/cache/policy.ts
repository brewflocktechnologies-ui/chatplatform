/**
 * Named freshness tiers for React Query. Every `queryOptions` picks a tier with
 * `cachePolicy(...)` instead of hand-writing `staleTime`/`gcTime`, so how long a kind
 * of data may be served from cache is decided here once.
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;

export const CACHE_TIERS = {
  /** Changes while the user watches (chat, engage); refetch almost every time. */
  live: { staleTime: 10 * SECOND, gcTime: 5 * MINUTE },
  /** Paged tables and filtered lists. */
  list: { staleTime: MINUTE, gcTime: 5 * MINUTE },
  /** Rarely-edited lookups reused across pages: plans and the customer/website pickers. */
  reference: { staleTime: 5 * MINUTE, gcTime: 30 * MINUTE }
} as const;

export type CacheTier = keyof typeof CACHE_TIERS;

/** Spread into `queryOptions`: `queryOptions({ queryKey, queryFn, ...cachePolicy('reference') })`. */
export const cachePolicy = (tier: CacheTier) => CACHE_TIERS[tier];

/** Client-wide default for queries that don't pick a tier. */
export const DEFAULT_CACHE_TIER: CacheTier = 'list';
