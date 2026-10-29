import { QueryClient, defaultShouldDehydrateQuery } from '@tanstack/react-query';
import { DEFAULT_CACHE_TIER, QUERY_FETCH_DEFAULTS, cachePolicy } from '@/lib/cache/policy';

const isServer = typeof window === 'undefined';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        ...cachePolicy(DEFAULT_CACHE_TIER),
        ...QUERY_FETCH_DEFAULTS,
        // A server prefetch that fails is better left to the client than retried (it would double a timeout).
        ...(isServer && { retry: 0 })
      },
      mutations: { networkMode: 'always' },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === 'pending'
      }
    }
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}
