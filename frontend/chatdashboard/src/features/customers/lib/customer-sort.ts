import type { CustomerSort, CustomerSortField } from '../api/types';

/** Table column id → billing API sort field. Columns not listed aren't sortable. */
export const COLUMN_SORT_FIELDS: Record<string, CustomerSortField> = {
  id: 'id',
  externalId: 'externalId',
  email: 'email',
  city: 'billingAddress.city',
  state: 'billingAddress.state',
  country: 'billingAddress.country',
  card: 'creditCard.brand'
};

/** Reads the first entry of the `sort` URL param (`[{"id":"email","desc":false}]`). */
export function parseSortParam(raw: string | null | undefined): CustomerSort | undefined {
  if (!raw) return undefined;
  try {
    const [first] = JSON.parse(raw) as { id: string; desc: boolean }[];
    const field = first && COLUMN_SORT_FIELDS[first.id];
    return field ? { field, dir: first.desc ? 'desc' : 'asc' } : undefined;
  } catch {
    return undefined;
  }
}
