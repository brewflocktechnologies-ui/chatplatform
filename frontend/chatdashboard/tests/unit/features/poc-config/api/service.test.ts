import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createPocConfig,
  deletePocConfig,
  updatePocConfig
} from '@/features/poc-config/api/service';
import { loadConfigs } from '@/features/poc-config/api/queries';
import type { PocConfigMutationPayload } from '@/features/poc-config/api/types';

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

const payload: PocConfigMutationPayload = {
  configName: 'Deploy Test',
  clientId: 'c1',
  clientName: 'Test Client',
  websiteId: 'w1',
  websiteLink: 'https://example.com',
  tenantId: 't-deploy-test',
  cdnConfig: '{"theme":"dark"}'
};

function lastRequest() {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  return { url: url as string, init };
}

describe('loadConfigs', () => {
  it('requests a 0-based page and returns the rows with the page count', async () => {
    respond(200, { content: [{ id: 'a', ...payload }], totalPages: 3 });

    await expect(loadConfigs(2, 25)).resolves.toEqual({
      configs: [{ id: 'a', ...payload }],
      pageCount: 3
    });

    expect(lastRequest().url).toBe(`${BASE}/api/v1/widget-configs?page=1&size=25`);
    expect(lastRequest().init.method).toBe('GET');
  });

  it('sends a supported sort field', async () => {
    respond(200, { content: [], totalPages: 0 });

    await loadConfigs(1, 10, { field: 'updatedAt', dir: 'desc' });

    expect(lastRequest().url).toBe(
      `${BASE}/api/v1/widget-configs?page=0&size=10&sort=updatedAt%2Cdesc`
    );
  });

  it('drops a sort field the API would answer 500 for', async () => {
    respond(200, { content: [], totalPages: 0 });

    await loadConfigs(1, 10, { field: 'tenantId', dir: 'asc' });

    expect(lastRequest().url).toBe(`${BASE}/api/v1/widget-configs?page=0&size=10`);
  });

  it('returns a failure as data instead of throwing', async () => {
    respond(500, { message: 'An unexpected error occurred' });

    await expect(loadConfigs(1, 10)).resolves.toEqual({
      error: 'An unexpected error occurred'
    });
  });
});

describe('createPocConfig', () => {
  it('POSTs the payload', async () => {
    respond(201, { id: 'x', ...payload });

    await expect(createPocConfig(payload)).resolves.toMatchObject({ ok: true });

    const { url, init } = lastRequest();
    expect(url).toBe(`${BASE}/api/v1/widget-configs`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      ...payload,
      createdBy: 'me',
      updatedBy: 'me',
      version: 0,
      new: false
    });
  });
});

describe('updatePocConfig', () => {
  it('PUTs to the config path, sending the id and version it read', async () => {
    respond(200, { id: 'abc', ...payload });

    await updatePocConfig('abc', payload, 3, 'alice');

    const { url, init } = lastRequest();
    expect(url).toBe(`${BASE}/api/v1/widget-configs/abc`);
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({
      ...payload,
      id: 'abc',
      createdBy: 'alice',
      updatedBy: 'me',
      version: 3,
      new: false
    });
  });

  it('falls back to the audit user when the config has no creator', async () => {
    respond(200, { id: 'abc', ...payload });

    await updatePocConfig('abc', payload, 0, null);

    expect(JSON.parse(lastRequest().init.body)).toMatchObject({ createdBy: 'me' });
  });

  it('maps a 404 to a readable message', async () => {
    respond(404, undefined);

    await expect(updatePocConfig('abc', payload, 0, null)).resolves.toMatchObject({
      ok: false,
      status: 404,
      message: 'Config not found'
    });
  });
});

describe('deletePocConfig', () => {
  it('DELETEs without a body', async () => {
    respond(204, undefined);

    await expect(deletePocConfig('abc')).resolves.toMatchObject({ ok: true });

    const { url, init } = lastRequest();
    expect(url).toBe(`${BASE}/api/v1/widget-configs/abc`);
    expect(init.method).toBe('DELETE');
    expect(init.body).toBeUndefined();
  });
});
