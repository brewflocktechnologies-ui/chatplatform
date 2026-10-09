import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { DEFAULT_PLAN_FILTERS, plansQueryOptions } from '../api/queries';
import { PlanAdmin } from './plan-admin';

export default function PlanListing() {
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(plansQueryOptions(DEFAULT_PLAN_FILTERS));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PlanAdmin />
    </HydrationBoundary>
  );
}
