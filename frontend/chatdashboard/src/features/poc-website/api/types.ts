export type PocWebsite = {
  id: string;
  protocol: string;
  domain: string;
  companyId: string;
  customerId: string;
  customerName: string;
  flavour: string | null;
  businessCategory: string | null;
  dateAdded: string | null;
  isActive: boolean;
  isVerified: boolean;
  configName: string | null;
  configId: string | null;
};

/** Request body for POST /api/v1/websites and PUT /api/v1/websites/{id} (assumed full replace). */
export type PocWebsiteMutationPayload = {
  protocol: string;
  domain: string;
  companyId: string;
  customerId: string;
  customerName: string;
  businessCategory: string;
  flavour: string;
  configName: string;
  configId: string | null;
  isActive: boolean;
  isVerified: boolean;
};
