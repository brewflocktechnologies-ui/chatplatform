import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createCustomer,
  deleteCustomer,
  getAllCustomers,
  getCustomer,
  getCustomers,
  updateCustomer
} from '@/features/customers/api/service';
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

describe('getAllCustomers concurrency', () => {
  it('keeps at most six page requests in flight', async () => {
    let inFlight = 0;
    let peak = 0;
    fetchMock.mockImplementation(async (url: string) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      const n = Number(new URL(url).searchParams.get('page'));
      return { ok: true, status: 200, json: async () => page([customer(n)], 20, n) };
    });

    const all = await getAllCustomers();

    expect(all.map((c) => c.id)).toEqual(Array.from({ length: 20 }, (_, i) => i));
    expect(peak).toBeLessThanOrEqual(6);
    expect(peak).toBeGreaterThan(1);
  });
});

describe('getCustomer', () => {
  it('reads one customer by id from the customers host', async () => {
    respond(200, customer(7953));
    expect(await getCustomer('7953')).toEqual(customer(7953));
    const url = requestedUrl();
    expect(url.origin).toBe(CUSTOMERS_BASE);
    expect(url.pathname).toBe('/api/customers/7953');
  });

  it('returns null when the customer does not exist', async () => {
    respond(404, { message: 'nope' });
    expect(await getCustomer('1')).toBeNull();
  });

  it('skips the request for a non-numeric id, which the API answers with a 500', async () => {
    expect(await getCustomer('6a8954401414ed899126ff36')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws on any other failure so the query enters its error state', async () => {
    respond(500, { message: 'boom' });
    await expect(getCustomer('1')).rejects.toThrow('Customers API responded with 500');
  });
});

describe('customer writes', () => {
  it('POSTs the payload to /api/customers on the customers host', async () => {
    respond(201, customer(8003));
    const payload = { email: 'new@example.com', externalId: null };

    const result = await createCustomer(payload);

    expect(result).toEqual({ ok: true, data: customer(8003) });
    const url = requestedUrl();
    expect(url.origin).toBe(CUSTOMERS_BASE);
    expect(url.pathname).toBe('/api/customers');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify(payload)
    });
  });

  it('hands validation errors back as data', async () => {
    respond(400, { message: 'Input validation errors', fieldErrors: { email: 'bad' } });

    const result = await createCustomer({ email: 'bad' });

    expect(result).toMatchObject({ ok: false, status: 400, fieldErrors: { email: 'bad' } });
  });

  it('PUTs to /api/customers/{id}, truncating the id', async () => {
    respond(200, customer(8003));

    await updateCustomer(8003.9, { email: 'a@b.co' });

    expect(requestedUrl().pathname).toBe('/api/customers/8003');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'PUT' });
  });

  it('words a failed DELETE as unsupported, since the API has no delete route', async () => {
    respond(500, { message: 'An unexpected error occurred' });

    const result = await deleteCustomer(8003);

    expect(requestedUrl().pathname).toBe('/api/customers/8003');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'DELETE' });
    expect(result).toEqual({
      ok: false,
      status: 500,
      message: 'The customers API does not support deleting customers yet.'
    });
  });

  it('keeps a 404 DELETE worded as not found', async () => {
    respond(404, { message: 'nope' });

    expect(await deleteCustomer(1)).toMatchObject({ ok: false, message: 'Customer not found' });
  });
});
