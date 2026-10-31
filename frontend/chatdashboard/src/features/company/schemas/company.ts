import * as z from 'zod';

export const companySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  contactEmail: z.union([z.literal(''), z.email('Please enter a valid email')]),
  contactPhone: z.string(),
  website: z.string(),
  industry: z.string(),
  employeeCount: z.number().int('Must be a whole number').min(0, 'Cannot be negative').optional(),
  streetAddress: z.string(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  country: z.string()
});

export type CompanyFormValues = z.infer<typeof companySchema>;
