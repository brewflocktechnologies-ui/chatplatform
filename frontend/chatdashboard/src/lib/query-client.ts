import { QueryClient, defaultShouldDehydrateQuery, isServer } from '@tanstack/react-query';
import { DEFAULT_CACHE_TIER, cachePolicy } from '@/lib/cache/policy';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: cachePolicy(DEFAULT_CACHE_TIER),
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
