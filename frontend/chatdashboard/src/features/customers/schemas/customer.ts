import * as z from 'zod';

export const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  country: z.string().min(2, 'Country is required'),
  activePlanName: z.string().min(1, 'Please select a plan'),
  status: z.string().min(1, 'Please select a status'),
  crm: z.boolean(),
  analytics: z.boolean()
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
