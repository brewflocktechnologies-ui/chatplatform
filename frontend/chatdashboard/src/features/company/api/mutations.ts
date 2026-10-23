import { mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { unwrap } from './errors';
import { createCompany, deleteCompany, updateCompany } from './service';
import { companyKeys } from './queries';
import type { CompanyMutationPayload } from './types';

const invalidate = () => getQueryClient().invalidateQueries({ queryKey: companyKeys.all });

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
