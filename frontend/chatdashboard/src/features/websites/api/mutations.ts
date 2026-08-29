import { mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { createWebsite, updateWebsite, deleteWebsite } from './service';
import { websiteKeys } from './queries';
import type { WebsiteMutationPayload } from './types';

export const createWebsiteMutation = mutationOptions({
  mutationFn: (data: WebsiteMutationPayload) => createWebsite(data),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: websiteKeys.all });
  }
});

export const updateWebsiteMutation = mutationOptions({
  mutationFn: ({ id, values }: { id: string; values: WebsiteMutationPayload }) =>
    updateWebsite(id, values),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: websiteKeys.all });
  }
});

export const deleteWebsiteMutation = mutationOptions({
  mutationFn: (id: string) => deleteWebsite(id),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: websiteKeys.all });
  }
});
