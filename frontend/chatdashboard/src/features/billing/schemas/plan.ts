import * as z from 'zod';

export const planSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Plan name is required')
      .max(100, 'Name must be 100 characters or fewer'),
    description: z.string().max(500, 'Description must be 500 characters or fewer'),
    amountMonthly: z
      .number({ error: 'Monthly price is required' })
      .int('Use a whole number')
      .min(0, 'Price cannot be negative'),
    amountAnnually: z
      .number({ error: 'Annual price is required' })
      .int('Use a whole number')
      .min(0, 'Price cannot be negative'),
    active: z.boolean(),
    freePlan: z.boolean(),
    defaultPlan: z.boolean(),
    custom: z.boolean()
  })
  .refine((v) => v.freePlan || v.amountMonthly > 0, {
    path: ['amountMonthly'],
    message: 'Paid plans need a monthly price above 0'
  });

export type PlanFormValues = z.infer<typeof planSchema>;
