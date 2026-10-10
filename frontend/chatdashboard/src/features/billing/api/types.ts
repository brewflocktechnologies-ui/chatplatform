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

/** Fields the billing API can sort by. Anything else makes it respond 500. */
export const PLAN_SORT_FIELDS = [
  'id',
  'name',
  'amountMonthly',
  'amountAnnually',
  'modifiedDate'
] as const;
export type PlanSortField = (typeof PLAN_SORT_FIELDS)[number];
export type PlanSortDirection = 'asc' | 'desc';

export type PlanSort = {
  field: PlanSortField;
  dir: PlanSortDirection;
};

export const PLAN_PAGE_SIZES = [10, 20, 50, 100] as const;

export type PlanFilters = {
  page: number;
  size: number;
  status: PlanStatusFilter;
  sort: PlanSort;
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
