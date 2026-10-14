import type { CompanySort, CompanySortField } from '../api/types';

/** Table column id → billing API sort field. Columns not listed aren't sortable. */
export const COLUMN_SORT_FIELDS: Record<string, CompanySortField> = {
  name: 'name',
  email: 'companyDetails.contactEmail',
  industry: 'companyDetails.industry',
  headquarters: 'headquarters.city',
  employees: 'companyDetails.employeeCount'
};

/** Reads the first entry of the `sort` URL param (`[{"id":"name","desc":false}]`). */
export function parseSortParam(raw: string | null | undefined): CompanySort | undefined {
  if (!raw) return undefined;
  try {
    const [first] = JSON.parse(raw) as { id: string; desc: boolean }[];
    const field = first && COLUMN_SORT_FIELDS[first.id];
    return field ? { field, dir: first.desc ? 'desc' : 'asc' } : undefined;
  } catch {
    return undefined;
  }
}
