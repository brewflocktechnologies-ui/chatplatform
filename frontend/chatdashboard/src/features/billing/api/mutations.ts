import { mutationOptions } from '@tanstack/react-query';
import { invalidateEntity } from '@/lib/cache/invalidation';
import { unwrap } from './errors';
import { createPlan, deletePlan, updatePlan } from './service';
import type { PlanMutationPayload } from './types';

const invalidate = () => invalidateEntity('plans');

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
