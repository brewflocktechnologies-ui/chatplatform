import type { CompaniesPage, Company } from '@/features/company/api/types';

export function makeCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: 1,
    name: 'Acme Corp',
    superCompany: null,
    companyDetails: {
      contactEmail: 'hello@acme.com',
      contactPhone: '+91-9123456780',
      website: 'https://www.acme.io',
      industry: 'Fintech',
      employeeCount: 1200
    },
    headquarters: {
      streetAddress: '45 Mount Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
      country: 'India'
    },
    customPlanIds: [3, 4],
    customerIds: [10],
    ...overrides
  };
}

export function makeCompanyPage(
  content: Company[],
  overrides: Partial<CompaniesPage> = {}
): CompaniesPage {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    number: 0,
    size: 10,
    ...overrides
  };
}
