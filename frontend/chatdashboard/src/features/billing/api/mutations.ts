import { mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { createPlan, deletePlan, updatePlan } from './service';
import { planKeys } from './queries';
import type { PlanMutationPayload } from './types';

const invalidate = () =>
  getQueryClient().invalidateQueries({ queryKey: planKeys.all });

export const createPlanMutation = mutationOptions({
  mutationFn: (data: PlanMutationPayload) => createPlan(data),
  onSuccess: invalidate
});

export const updatePlanMutation = mutationOptions({
  mutationFn: ({ id, values }: { id: number; values: PlanMutationPayload }) =>
    updatePlan(id, values),
  onSuccess: invalidate
});

export const deletePlanMutation = mutationOptions({
  mutationFn: (id: number) => deletePlan(id),
  onSuccess: invalidate
});
