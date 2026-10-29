import * as z from 'zod';

export const customerSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').pipe(z.email('Please enter a valid email')),
  externalId: z.string(),
  line1: z.string(),
  line2: z.string(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  country: z.string()
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
