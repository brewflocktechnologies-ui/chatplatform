import type { PageResponse } from '@/lib/billing/client';

export type CustomerAddress = {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

export type CustomerCreditCard = {
  brand: string | null;
  numberLastFourDigits: string | null;
};

export type CustomerInvoice = {
  id: number;
  externalId: string;
  status: string;
  currency: string;
  amountDue: number;
  amountPaid: number;
};

export type Customer = {
  id: number;
  externalId: string;
  email: string;
  activePlan: { id: number; name: string } | null;
  billingAddress: CustomerAddress | null;
  creditCard: CustomerCreditCard | null;
  invoices: CustomerInvoice[];
};

/** Fields the billing API accepts in `sort=`; anything else makes it return 500. */
export const CUSTOMER_SORT_FIELDS = [
  'id',
  'externalId',
  'email',
  'billingAddress.city',
  'billingAddress.state',
  'billingAddress.country',
  'billingAddress.postalCode',
  'creditCard.brand'
] as const;

export type CustomerSortField = (typeof CUSTOMER_SORT_FIELDS)[number];

export type CustomerSort = { field: CustomerSortField; dir: 'asc' | 'desc' };

/** `page` is 0-based, as the billing API expects. */
export type CustomerFilters = {
  page: number;
  size: number;
  sort?: CustomerSort;
};

/** Spring Data `Page` envelope returned by GET /api/customers. */
export type CustomersPage = PageResponse<Customer>;

/** Billing address as the API accepts it; every part is optional. */
export type CustomerAddressPayload = {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

/**
 * Body of POST /api/customers and PUT /api/customers/{id}. Only `email` is required. PUT merges:
 * an omitted or null field keeps its stored value, and an empty string clears it.
 */
export type CustomerMutationPayload = {
  email: string;
  externalId?: string | null;
  billingAddress?: CustomerAddressPayload;
};
