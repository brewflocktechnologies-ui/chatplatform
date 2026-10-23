import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAllCustomers, getCustomers } from '@/features/customers/api/service';
import type { Customer } from '@/features/customers/api/types';

const CUSTOMERS_BASE = 'https://customers.test';
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

const customer = (id: number): Customer => ({
  id,
  externalId: `ext-${id}`,
  email: `c${id}@example.com`,
  activePlan: null,
  billingAddress: null,
  creditCard: null,
  invoices: []
});

const page = (content: Customer[], totalPages = 1, number = 0) => ({
  content,
  totalElements: content.length,
  totalPages,
  number,
  size: 100
});

const requestedUrl = (call = 0) => new URL(fetchMock.mock.calls[call][0] as string);

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  // The customers host must win over the main billing host.
  vi.stubEnv('BILLING_API_URL', 'https://billing.test');
  vi.stubEnv('CUSTOMERS_API_URL', `${CUSTOMERS_BASE}/`);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('getCustomers', () => {
  it('reads /api/customers from the customers host with 0-based paging', async () => {
    const body = page([customer(1)]);
    respond(200, body);

    const result = await getCustomers({ page: 0, size: 10 });

    expect(result).toEqual(body);
    const url = requestedUrl();
    expect(url.origin).toBe(CUSTOMERS_BASE);
    expect(url.pathname).toBe('/api/customers');
    expect(url.searchParams.get('page')).toBe('0');
    expect(url.searchParams.get('size')).toBe('10');
    expect(url.searchParams.has('sort')).toBe(false);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'GET' });
  });

  it('sends a known sort field as field,dir', async () => {
    respond(200, page([]));
    await getCustomers({ page: 0, size: 10, sort: { field: 'billingAddress.city', dir: 'desc' } });
    expect(requestedUrl().searchParams.get('sort')).toBe('billingAddress.city,desc');
  });

  it('drops an unknown sort field, which the API would answer with a 500', async () => {
    respond(200, page([]));
    await getCustomers({ page: 0, size: 10, sort: { field: 'bogus', dir: 'asc' } as never });
    expect(requestedUrl().searchParams.has('sort')).toBe(false);
  });

  it('clamps a client-supplied page size to 100', async () => {
    respond(200, page([]));
    await getCustomers({ page: 0, size: 5000 });
    expect(requestedUrl().searchParams.get('size')).toBe('100');
  });

  it('throws so the query enters its error state', async () => {
    respond(500, { message: 'boom' });
    await expect(getCustomers({ page: 0, size: 10 })).rejects.toThrow(
      'Customers API responded with 500'
    );
  });

  it('throws when the service is unreachable', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network'));
    await expect(getCustomers({ page: 0, size: 10 })).rejects.toThrow(
      'Customers API responded with 0'
    );
  });
});

describe('getAllCustomers', () => {
  it('returns a single page without further requests', async () => {
    respond(200, page([customer(1), customer(2)], 1));

    const all = await getAllCustomers();

    expect(all.map((c) => c.id)).toEqual([1, 2]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(requestedUrl().searchParams.get('size')).toBe('100');
  });

  it('walks every remaining page and keeps the sort', async () => {
    respond(200, page([customer(1)], 3, 0));
    respond(200, page([customer(2)], 3, 1));
    respond(200, page([customer(3)], 3, 2));

    const all = await getAllCustomers({ field: 'email', dir: 'asc' });

    expect(all.map((c) => c.id)).toEqual([1, 2, 3]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const pages = [0, 1, 2].map((i) => requestedUrl(i).searchParams.get('page'));
    expect(pages).toEqual(['0', '1', '2']);
    for (let i = 0; i < 3; i++) {
      expect(requestedUrl(i).searchParams.get('sort')).toBe('email,asc');
    }
  });
});
