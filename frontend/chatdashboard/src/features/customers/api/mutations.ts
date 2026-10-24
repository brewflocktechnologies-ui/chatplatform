import { mutationOptions } from '@tanstack/react-query';
import { invalidateEntity } from '@/lib/cache/invalidation';
import { unwrap } from './errors';
import { createCustomer, deleteCustomer, updateCustomer } from './service';
import type { CustomerMutationPayload } from './types';

const invalidate = () => invalidateEntity('customers');

export const createCustomerMutation = mutationOptions({
  mutationFn: async (data: CustomerMutationPayload) => unwrap(await createCustomer(data)),
  onSuccess: invalidate
});

export const updateCustomerMutation = mutationOptions({
  mutationFn: async ({ id, values }: { id: number; values: CustomerMutationPayload }) =>
    unwrap(await updateCustomer(id, values)),
  onSuccess: invalidate
});

export const deleteCustomerMutation = mutationOptions({
  mutationFn: async (id: number) => unwrap(await deleteCustomer(id)),
  onSuccess: invalidate
});
