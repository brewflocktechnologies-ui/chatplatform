import type { Customer } from '../api/types';

/** Case-insensitive match across the fields shown in the table. */
export function matchesSearch(customer: Customer, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const a = customer.billingAddress;
  return [
    customer.id,
    customer.externalId,
    customer.email,
    customer.activePlan?.name,
    a?.city,
    a?.state,
    a?.country,
    customer.creditCard?.brand
  ].some((v) => v != null && String(v).toLowerCase().includes(q));
}
