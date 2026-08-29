export type Customer = {
  id: string;
  name: string;
  email: string;
  country: string;
  dateAdded: string;
  // Stored in Mongo as a JSON string, e.g. '{"crm":"no","analytics":"no"}'
  integrations: string;
  activePlanName: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CustomerFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  plan?: string;
  sort?: string;
};

export type CustomersResponse = {
  success: boolean;
  time: string;
  message: string;
  total_customers: number;
  offset: number;
  limit: number;
  customers: Customer[];
};

export type CustomerMutationPayload = {
  name: string;
  email: string;
  country: string;
  activePlanName: string;
  status: string;
  integrations: string;
};
