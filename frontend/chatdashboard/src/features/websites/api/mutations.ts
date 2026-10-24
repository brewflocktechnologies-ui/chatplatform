import { mutationOptions } from '@tanstack/react-query';
import { invalidateEntity } from '@/lib/cache/invalidation';
import { createWebsite, updateWebsite, deleteWebsite } from './service';
import type { WebsiteMutationPayload } from './types';

export const createWebsiteMutation = mutationOptions({
  mutationFn: (data: WebsiteMutationPayload) => createWebsite(data),
  onSuccess: () => {
    invalidateEntity('websites');
  }
});

export const updateWebsiteMutation = mutationOptions({
  mutationFn: ({ id, values }: { id: string; values: WebsiteMutationPayload }) =>
    updateWebsite(id, values),
  onSuccess: () => {
    invalidateEntity('websites');
  }
});

export const deleteWebsiteMutation = mutationOptions({
  mutationFn: (id: string) => deleteWebsite(id),
  onSuccess: () => {
    invalidateEntity('websites');
  }
});
