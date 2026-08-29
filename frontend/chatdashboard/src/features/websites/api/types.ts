export type Website = {
  id: string;
  protocol: string;
  domain: string;
  companyId: string;
  customerId: string;
  customerName: string;
  flavour: string;
  businessCategory: string;
  dateAdded: string;
  isActive: boolean;
  isVerified: boolean;
  configName?: string;
  configId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type WebsiteFilters = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  customerId?: string;
  sort?: string;
};

export type WebsitesResponse = {
  success: boolean;
  time: string;
  message: string;
  total_websites: number;
  offset: number;
  limit: number;
  websites: Website[];
};

export type WebsiteMutationPayload = {
  protocol: string;
  domain: string;
  customerId: string;
  customerName: string;
  companyId: string;
  businessCategory: string;
  flavour: string;
  configName: string;
  isActive: boolean;
  isVerified: boolean;
};
