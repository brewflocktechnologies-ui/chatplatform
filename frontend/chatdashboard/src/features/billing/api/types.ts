/** Opaque nested objects the API stores but this UI doesn't edit. */
export type PlanModule = Record<string, unknown>;

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
  smartChatModule: PlanModule | null;
  managedAccountsModule: PlanModule | null;
  companyIds: number[];
  planProductPrice: PlanModule | null;
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

/**
 * Body for POST and PUT. PUT is a full replace, so every field is always sent;
 * id and audit fields are server-managed and must not be included.
 */
export type PlanMutationPayload = Pick<
  Plan,
  | 'name'
  | 'description'
  | 'amountMonthly'
  | 'amountAnnually'
  | 'active'
  | 'freePlan'
  | 'defaultPlan'
  | 'custom'
  | 'companyIds'
  | 'smartChatModule'
  | 'managedAccountsModule'
  | 'planProductPrice'
>;

/** Server actions return failures as data; thrown errors lose their message in production. */
export type PlanResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      status: number;
      message: string;
      fieldErrors?: Record<string, string>;
    };
