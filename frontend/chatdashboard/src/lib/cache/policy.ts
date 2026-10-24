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
  /**
   * Paged tables and filtered lists. Kept for an hour after the last view so coming back
   * to a tab shows the cached rows at once while a fresh copy loads behind them.
   */
  list: { staleTime: MINUTE, gcTime: 60 * MINUTE },
  /** Rarely-edited lookups reused across pages: plans and the customer/website pickers. */
  reference: { staleTime: 5 * MINUTE, gcTime: 60 * MINUTE }
} as const;

export type CacheTier = keyof typeof CACHE_TIERS;

/** Spread into `queryOptions`: `queryOptions({ queryKey, queryFn, ...cachePolicy('reference') })`. */
export const cachePolicy = (tier: CacheTier) => CACHE_TIERS[tier];

/** Client-wide default for queries that don't pick a tier. */
export const DEFAULT_CACHE_TIER: CacheTier = 'list';

/**
 * Fetch behaviour shared by every query.
 * - `networkMode: 'always'`: the default pauses queries whenever `navigator.onLine` is false,
 *   which browsers leave stuck after sleep or a network switch, so nothing fetches until a reload.
 * - one quick retry: the billing API can take 30s to time out, so three backoff retries meant
 *   minutes of a blank screen before any error appeared.
 * - refetch when the tab regains focus or the connection returns, so data that went stale while
 *   away is replaced without a manual refresh (the tiers' `staleTime` decides what counts as stale).
 */
export const QUERY_FETCH_DEFAULTS = {
  networkMode: 'always',
  retry: 1,
  retryDelay: 1500,
  refetchOnWindowFocus: true,
  refetchOnReconnect: 'always'
} as const;
