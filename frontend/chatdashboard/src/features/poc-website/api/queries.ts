import { queryOptions } from '@tanstack/react-query';
import { entityRoots } from '@/lib/cache/keys';
import { cachePolicy } from '@/lib/cache/policy';
import { getAllPocWebsites } from './service';

export const pocWebsiteKeys = {
  all: entityRoots.pocWebsites
};

/** Every registered website, for pickers that link a config to a customer's website. */
export const allPocWebsitesQueryOptions = () =>
  queryOptions({
    queryKey: pocWebsiteKeys.all,
    queryFn: () => getAllPocWebsites(),
    ...cachePolicy('reference')
  });
