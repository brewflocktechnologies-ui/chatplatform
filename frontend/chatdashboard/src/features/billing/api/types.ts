export type Plan = {
  id: number;
  name: string;
  description: string | null;
  amountMonthly: number;
  amountAnnually: number;
  freePlan: boolean;
  defaultPlan: boolean;
  active: boolean;
  custom: boolean;
  smartChatModule: string | null;
  managedAccountsModule: string | null;
  companyIds: number[];
  planProductPrice: string | null;
  createdDate: string;
  modifiedDate: string;
  createdByUserId: number | null;
  modifiedByUserId: number | null;
};

export type PlansPage = {
  content: Plan[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export type PlanStatusFilter = 'all' | 'active';

export type PlanFilters = {
  page: number;
  size: number;
  status: PlanStatusFilter;
};

/** Fields an admin can edit; the rest of `Plan` is server-managed. */
export type PlanMutationPayload = Pick<
  Plan,
  | 'name'
  | 'description'
  | 'amountMonthly'
  | 'amountAnnually'
  | 'active'
  | 'freePlan'
  | 'defaultPlan'
>;
