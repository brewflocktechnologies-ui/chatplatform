import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createCompany,
  deleteCompany,
  getAllCompanies,
  getCompanies,
  updateCompany
} from '@/features/company/api/service';
import type { CompanyMutationPayload } from '@/features/company/api/types';
import { makeCompany, makeCompanyPage } from '../fixtures';

const BASE = 'https://billing.test';
const fetchMock = vi.fn();

function respond(status: number, body: unknown) {
  fetchMock.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (body === undefined) throw new Error('no body');
      return body;
    }
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('BILLING_API_URL', BASE);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function request(i = -1) {
  const [rawUrl, init] = fetchMock.mock.calls.at(i)!;
  const url = new URL(rawUrl);
  return { path: url.pathname, params: Object.fromEntries(url.searchParams), init };
}

const payload: CompanyMutationPayload = {
  name: 'Acme',
  companyDetails: {
    contactEmail: null,
    contactPhone: null,
    website: null,
    industry: null,
    employeeCount: null
  },
  headquarters: {
    streetAddress: null,
    city: null,
    state: null,
    postalCode: null,
    country: null
  },
  customPlanIds: [],
  customerIds: []
};

describe('getCompanies', () => {
  it('requests the paged list', async () => {
    const page = makeCompanyPage([makeCompany()]);
    respond(200, page);

    await expect(getCompanies({ page: 1, size: 20 })).resolves.toEqual(page);

    expect(request()).toMatchObject({
      path: '/api/v1/companies',
      params: { page: '1', size: '20' }
    });
  });

  it('adds a whitelisted sort', async () => {
    respond(200, makeCompanyPage([]));
    await getCompanies({ page: 0, size: 10, sort: { field: 'headquarters.city', dir: 'desc' } });
    expect(request().params.sort).toBe('headquarters.city,desc');
  });

  it('drops an unknown sort field', async () => {
    respond(200, makeCompanyPage([]));
    await getCompanies({ page: 0, size: 10, sort: { field: 'password' as never, dir: 'asc' } });
    expect(request().params).not.toHaveProperty('sort');
  });

  it('clamps client-supplied paging', async () => {
    respond(200, makeCompanyPage([]));
    await getCompanies({ page: -4, size: 5000 });
    expect(request().params).toMatchObject({ page: '0', size: '100' });
  });

  it('throws when the API fails, so React Query enters its error state', async () => {
    respond(500, { error: 'boom' });
    await expect(getCompanies({ page: 0, size: 10 })).rejects.toThrow(
      'Billing API responded with 500'
    );
  });
});

describe('getAllCompanies', () => {
  it('returns a single page without further requests', async () => {
    respond(200, makeCompanyPage([makeCompany({ id: 1 })], { totalPages: 1 }));

    const all = await getAllCompanies();

    expect(all.map((c) => c.id)).toEqual([1]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(request().params).toMatchObject({ page: '0', size: '100' });
  });

  it('walks every remaining page and flattens in order', async () => {
    respond(200, makeCompanyPage([makeCompany({ id: 1 })], { totalPages: 3 }));
    respond(200, makeCompanyPage([makeCompany({ id: 2 })], { totalPages: 3 }));
    respond(200, makeCompanyPage([makeCompany({ id: 3 })], { totalPages: 3 }));

    const all = await getAllCompanies({ field: 'name', dir: 'asc' });

    expect(all.map((c) => c.id)).toEqual([1, 2, 3]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const pages = fetchMock.mock.calls.map(([u]) => new URL(u).searchParams.get('page')).sort();
    expect(pages).toEqual(['0', '1', '2']);
    expect(request(0).params.sort).toBe('name,asc');
  });
});

describe('createCompany', () => {
  it('POSTs the payload and returns the result', async () => {
    const created = makeCompany({ id: 9 });
    respond(201, created);

    await expect(createCompany(payload)).resolves.toEqual({ ok: true, data: created });

    const { path, init } = request();
    expect(path).toBe('/api/v1/companies');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(payload);
  });

  it('returns field errors as data instead of throwing', async () => {
    respond(400, { message: 'Validation Failed', fieldErrors: { name: 'required' } });

    await expect(createCompany(payload)).resolves.toEqual({
      ok: false,
      status: 400,
      message: 'Validation Failed',
      fieldErrors: { name: 'required' }
    });
  });
});

describe('updateCompany', () => {
  it('PUTs to the company id', async () => {
    respond(200, makeCompany({ id: 7 }));
    await updateCompany(7.9, payload);

    const { path, init } = request();
    expect(path).toBe('/api/v1/companies/7');
    expect(init.method).toBe('PUT');
  });

  it('words a 404 as "Company not found"', async () => {
    respond(404, { error: 'raw' });
    await expect(updateCompany(7, payload)).resolves.toMatchObject({
      ok: false,
      status: 404,
      message: 'Company not found'
    });
  });
});

describe('deleteCompany', () => {
  it('sends DELETE without a body', async () => {
    respond(200, null);
    await expect(deleteCompany(5)).resolves.toEqual({ ok: true, data: null });

    const { path, init } = request();
    expect(path).toBe('/api/v1/companies/5');
    expect(init.method).toBe('DELETE');
    expect(init.body).toBeUndefined();
  });

  it('reports an unreachable service', async () => {
    fetchMock.mockRejectedValueOnce(new Error('down'));
    await expect(deleteCompany(5)).resolves.toEqual({
      ok: false,
      status: 0,
      message: 'Billing service is unreachable'
    });
  });
});
