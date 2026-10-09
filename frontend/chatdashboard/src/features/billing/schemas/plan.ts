import * as z from 'zod';

export const planSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    description: z.string(),
    amountMonthly: z
      .number({ error: 'Monthly price is required' })
      .min(0, 'Price cannot be negative'),
    amountAnnually: z
      .number({ error: 'Annual price is required' })
      .min(0, 'Price cannot be negative'),
    active: z.boolean(),
    freePlan: z.boolean(),
    defaultPlan: z.boolean()
  })
  .refine((v) => v.freePlan || v.amountMonthly > 0, {
    path: ['amountMonthly'],
    message: 'Paid plans need a monthly price above 0'
  });

export type PlanFormValues = z.infer<typeof planSchema>;
