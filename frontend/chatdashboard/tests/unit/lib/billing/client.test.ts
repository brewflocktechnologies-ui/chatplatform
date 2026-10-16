import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { billingGet, billingRequest, pageParams, sortParam } from '@/lib/billing/client';
import { ApiError, unwrap } from '@/lib/billing/errors';

const fetchMock = vi.fn();

function respond(status: number, body: unknown) {
  fetchMock.mockResolvedValue({
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
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('base URL', () => {
  it('uses BILLING_API_URL and trims trailing slashes', async () => {
    vi.stubEnv('BILLING_API_URL', 'https://billing.example.test//');
    respond(200, {});
    await billingRequest('GET', '/api/x');
    expect(fetchMock.mock.calls[0][0]).toBe('https://billing.example.test/api/x');
  });

  it('refuses to fall back to a hardcoded host in production', async () => {
    vi.stubEnv('BILLING_API_URL', '');
    vi.stubEnv('NODE_ENV', 'production');
    // The throw happens inside the try block, so it surfaces as an unreachable result.
    await expect(billingRequest('GET', '/api/x')).resolves.toMatchObject({ ok: false, status: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('billingRequest', () => {
  it('sends JSON only when there is a body, and always a timeout signal', async () => {
    respond(200, {});
    await billingRequest('GET', '/a');
    await billingRequest('POST', '/a', { body: { n: 1 } });
    const [, get] = fetchMock.mock.calls[0];
    const [, post] = fetchMock.mock.calls[1];
    expect(get.headers).toBeUndefined();
    expect(get.signal).toBeInstanceOf(AbortSignal);
    expect(post.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(post.body).toBe('{"n":1}');
  });

  it('treats a successful empty body (e.g. DELETE) as null data', async () => {
    respond(204, undefined);
    await expect(billingRequest('DELETE', '/a/1')).resolves.toEqual({ ok: true, data: null });
  });

  it("prefers the caller's 404 wording, else error, message, then the status", async () => {
    respond(404, { error: 'boom' });
    await expect(billingRequest('PUT', '/a', { notFoundMessage: 'Gone' })).resolves.toMatchObject({
      message: 'Gone'
    });
    await expect(billingRequest('PUT', '/a')).resolves.toMatchObject({ message: 'boom' });
    respond(500, { message: 'from message' });
    await expect(billingRequest('PUT', '/a')).resolves.toMatchObject({ message: 'from message' });
    respond(502, undefined);
    await expect(billingRequest('PUT', '/a')).resolves.toMatchObject({
      message: 'Billing API responded with 502'
    });
  });

  it('reports a network failure or timeout as an unreachable result', async () => {
    fetchMock.mockRejectedValue(new DOMException('timed out', 'TimeoutError'));
    await expect(billingRequest('GET', '/a')).resolves.toEqual({
      ok: false,
      status: 0,
      message: 'Billing service is unreachable'
    });
  });
});

describe('billingGet', () => {
  it('returns the data, or throws with the status', async () => {
    respond(200, { content: [] });
    await expect(billingGet('/a', new URLSearchParams({ page: '0' }))).resolves.toEqual({
      content: []
    });
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/a\?page=0$/);

    respond(500, {});
    await expect(billingGet('/a')).rejects.toThrow('Billing API responded with 500');
  });
});

describe('pageParams', () => {
  it('clamps paging to sane bounds', () => {
    expect(Object.fromEntries(pageParams(-3, 100000))).toEqual({ page: '0', size: '100' });
    expect(Object.fromEntries(pageParams(Number.NaN, 0))).toEqual({ page: '0', size: '10' });
    expect(Object.fromEntries(pageParams(2.9, 25))).toEqual({ page: '2', size: '25' });
  });
});

describe('sortParam', () => {
  const allowed = ['id', 'name'] as const;

  it('builds field,dir for an allowed field', () => {
    expect(sortParam({ field: 'name', dir: 'asc' }, allowed)).toBe('name,asc');
  });

  it('uses the fallback for an unknown field, or nothing without one', () => {
    const bad = { field: 'bogus', dir: 'asc' } as never;
    expect(sortParam(bad, allowed, { fallback: { field: 'id', dir: 'desc' } })).toBe('id,desc');
    expect(sortParam(bad, allowed)).toBeUndefined();
    expect(sortParam(undefined, allowed)).toBeUndefined();
  });

  it('normalises an unexpected direction to the default', () => {
    const odd = { field: 'name', dir: 'sideways' } as never;
    expect(sortParam(odd, allowed)).toBe('name,asc');
    expect(sortParam(odd, allowed, { defaultDir: 'desc' })).toBe('name,desc');
  });
});

describe('unwrap', () => {
  it('returns data or throws an ApiError carrying status and field errors', () => {
    expect(unwrap({ ok: true, data: 5 })).toBe(5);
    try {
      unwrap({ ok: false, status: 400, message: 'bad', fieldErrors: { name: 'x' } });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).fieldErrors).toEqual({ name: 'x' });
    }
  });
});
