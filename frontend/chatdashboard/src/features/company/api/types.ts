export type CompanyDetails = {
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  industry: string | null;
  employeeCount: number | null;
};

export type CompanyHeadquarters = {
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

export type Company = {
  id: number;
  name: string;
  superCompany: Company | null;
  companyDetails: CompanyDetails | null;
  headquarters: CompanyHeadquarters | null;
  customPlanIds: number[];
  customerIds: number[];
};

/** Fields the billing API accepts in `sort=`; anything else makes it return 500. */
export const COMPANY_SORT_FIELDS = [
  'name',
  'companyDetails.contactEmail',
  'companyDetails.industry',
  'companyDetails.employeeCount',
  'companyDetails.contactPhone',
  'headquarters.city',
  'headquarters.state',
  'headquarters.country',
  'headquarters.postalCode'
] as const;

export type CompanySortField = (typeof COMPANY_SORT_FIELDS)[number];

export type CompanySort = { field: CompanySortField; dir: 'asc' | 'desc' };

export type CompanyFilters = {
  page: number;
  size: number;
  sort?: CompanySort;
};

/** Spring Data `Page` envelope returned by GET /api/v1/companies. */
export type CompaniesPage = {
  content: Company[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export const COMPANY_PAGE_SIZES = [10, 20, 50, 100] as const;

/** Request body for POST /api/v1/companies and PUT /api/v1/companies/{id} (full replace). */
export type CompanyMutationPayload = {
  name: string;
  companyDetails: CompanyDetails;
  headquarters: CompanyHeadquarters;
  customPlanIds: number[];
  customerIds: number[];
};

export type CompanyResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string; fieldErrors?: Record<string, string> };
