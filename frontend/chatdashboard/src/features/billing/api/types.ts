export type Plan = {
  id: number;
  name: string;
  description: string | null;
  amountMonthly: number;
  amountAnnually: number;
  freePlan: boolean;
  defaultPlan: boolean;
  active: boolean;
};

export type PlansPage = {
  content: Plan[];
  totalElements: number;
};
