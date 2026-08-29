import * as z from 'zod';

export const websiteSchema = z.object({
  protocol: z.string().min(1, 'Please select a protocol'),
  domain: z
    .string()
    .min(3, 'Domain is required')
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i, {
      message: 'Enter a bare domain like example.com (no protocol or path)'
    }),
  customerId: z.string().min(1, 'Please select a customer'),
  businessCategory: z.string().min(1, 'Please select a category'),
  flavour: z.string().min(1, 'Flavour / config name is required'),
  isActive: z.boolean(),
  isVerified: z.boolean()
});

export type WebsiteFormValues = z.infer<typeof websiteSchema>;
