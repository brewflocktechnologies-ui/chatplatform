import { mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { unwrap } from './errors';
import { createPlan, deletePlan, updatePlan } from './service';
import { planKeys } from './queries';
import type { PlanMutationPayload } from './types';

const invalidate = () =>
  getQueryClient().invalidateQueries({ queryKey: planKeys.all });

export const createPlanMutation = mutationOptions({
  mutationFn: async (data: PlanMutationPayload) => unwrap(await createPlan(data)),
  onSuccess: invalidate
});

export const updatePlanMutation = mutationOptions({
  mutationFn: async ({ id, values }: { id: number; values: PlanMutationPayload }) =>
    unwrap(await updatePlan(id, values)),
  onSuccess: invalidate
});

export const deletePlanMutation = mutationOptions({
  mutationFn: async (id: number) => unwrap(await deletePlan(id)),
  onSuccess: invalidate
});
