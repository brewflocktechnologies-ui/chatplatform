import type { Customer } from '../api/types';

/**
 * Dropdown option for a customer. The API has no name field, so the email is
 * the label; the value is the id as a string, which is what websites store.
 */
export const toCustomerOption = (customer: Customer) => ({
  value: String(customer.id),
  label: customer.email
});
