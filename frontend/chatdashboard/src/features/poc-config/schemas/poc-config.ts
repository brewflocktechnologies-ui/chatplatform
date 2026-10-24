import * as z from 'zod';

export const pocConfigSchema = z.object({
  configName: z.string().trim().min(1, 'Config name is required'),
  tenantId: z.string().trim().min(1, 'Tenant ID is required'),
  clientId: z.string().trim().min(1, 'Client ID is required'),
  clientName: z.string().trim().min(1, 'Client name is required'),
  websiteId: z.string().trim().min(1, 'Website ID is required'),
  websiteLink: z.union([z.literal(''), z.url('Enter a full URL like https://example.com')]),
  cdnConfig: z.string().refine((value) => {
    if (!value.trim()) return true;
    try {
      const parsed: unknown = JSON.parse(value);
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
    } catch {
      return false;
    }
  }, 'Must be a valid JSON object')
});

export type PocConfigFormValues = z.infer<typeof pocConfigSchema>;
