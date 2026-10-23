import type { Company } from '../api/types';

/** Case-insensitive match across the fields shown in the table. */
export function matchesSearch(company: Company, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const d = company.companyDetails;
  const h = company.headquarters;
  return [
    company.id,
    company.name,
    d?.contactEmail,
    d?.contactPhone,
    d?.website,
    d?.industry,
    h?.city,
    h?.state,
    h?.country
  ].some((v) => v != null && String(v).toLowerCase().includes(q));
}
