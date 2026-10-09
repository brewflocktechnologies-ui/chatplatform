import { queryOptions } from '@tanstack/react-query';
import { getActivePlans } from './service';

export const planKeys = {
  all: ['plans'] as const,
  active: (size: number) => [...planKeys.all, 'active', size] as const,
};

export const activePlansQueryOptions = (size: number) =>
  queryOptions({
    queryKey: planKeys.active(size),
    queryFn: () => getActivePlans(size),
  });
