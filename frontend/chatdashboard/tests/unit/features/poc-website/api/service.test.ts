import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createPocWebsite,
  deletePocWebsite,
  updatePocWebsite
} from '@/features/poc-website/api/service';
import type { PocWebsiteMutationPayload } from '@/features/poc-website/api/types';

const POC_BASE = 'https://poc.test';
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
  // The POC host must win over the main billing host.
  vi.stubEnv('BILLING_API_URL', 'https://billing.test');
  vi.stubEnv('POC_WEBSITES_API_URL', `${POC_BASE}/`);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const payload: PocWebsiteMutationPayload = {
  protocol: 'HTTPS',
  domain: 'example.com',
  companyId: 'c-1',
  customerId: 'c-1',
  customerName: 'Acme',
  businessCategory: 'Saas',
  flavour: 'Orange',
  configName: 'Orange',
  configId: null,
  isActive: true,
  isVerified: false
};

function lastRequest() {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  return { url: url as string, init };
}

describe('createPocWebsite', () => {
  it('POSTs the payload to the POC host', async () => {
    respond(201, { id: 'w-1', ...payload });

    await expect(createPocWebsite(payload)).resolves.toMatchObject({ ok: true });

    const { url, init } = lastRequest();
    expect(url).toBe(`${POC_BASE}/api/v1/websites`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(payload);
  });

  it('returns API field errors as data', async () => {
    respond(400, { message: 'Invalid', fieldErrors: { domain: 'taken' } });

    await expect(createPocWebsite(payload)).resolves.toEqual({
      ok: false,
      status: 400,
      message: 'Invalid',
      fieldErrors: { domain: 'taken' }
    });
  });
});

describe('updatePocWebsite', () => {
  it('PUTs to the website path with the id encoded', async () => {
    respond(200, { id: 'a/b', ...payload });

    await updatePocWebsite('a/b', payload);

    const { url, init } = lastRequest();
    expect(url).toBe(`${POC_BASE}/api/v1/websites/a%2Fb`);
    expect(init.method).toBe('PUT');
  });

  it('maps a 404 to a readable message', async () => {
    respond(404, undefined);

    await expect(updatePocWebsite('w-1', payload)).resolves.toMatchObject({
      ok: false,
      status: 404,
      message: 'Website not found'
    });
  });
});

describe('deletePocWebsite', () => {
  it('DELETEs without a body', async () => {
    respond(204, undefined);

    await expect(deletePocWebsite('w-1')).resolves.toMatchObject({ ok: true });

    const { url, init } = lastRequest();
    expect(url).toBe(`${POC_BASE}/api/v1/websites/w-1`);
    expect(init.method).toBe('DELETE');
    expect(init.body).toBeUndefined();
  });
});
