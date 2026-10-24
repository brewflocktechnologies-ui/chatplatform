import { mutationOptions } from '@tanstack/react-query';
import { invalidateEntity } from '@/lib/cache/invalidation';
import { unwrap } from './errors';
import { createCompany, deleteCompany, updateCompany } from './service';
import type { CompanyMutationPayload } from './types';

const invalidate = () => invalidateEntity('companies');

export const createCompanyMutation = mutationOptions({
  mutationFn: async (data: CompanyMutationPayload) => unwrap(await createCompany(data)),
  onSuccess: invalidate
});

export const updateCompanyMutation = mutationOptions({
  mutationFn: async ({ id, values }: { id: number; values: CompanyMutationPayload }) =>
    unwrap(await updateCompany(id, values)),
  onSuccess: invalidate
});

export const deleteCompanyMutation = mutationOptions({
  mutationFn: async (id: number) => unwrap(await deleteCompany(id)),
  onSuccess: invalidate
});
