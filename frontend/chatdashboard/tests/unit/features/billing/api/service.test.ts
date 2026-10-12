import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPlan, deletePlan, getPlans, updatePlan } from '@/features/billing/api/service';
import { toPayload } from '@/features/billing/lib/plan-payload';
import type { PlanFilters } from '@/features/billing/api/types';
import { makePlan, makePage } from '../fixtures';

const BASE = 'https://billing-service-eta.vercel.app';
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
});

const filters: PlanFilters = {
  page: 0,
  size: 10,
  status: 'all',
  sort: { field: 'id', dir: 'desc' }
};

/** The URL getPlans last fetched, split so assertions don't depend on param order/encoding. */
function lastRequest() {
  const url = new URL(fetchMock.mock.calls.at(-1)![0]);
  return { path: url.pathname, params: Object.fromEntries(url.searchParams) };
}

describe('getPlans', () => {
  it('requests the paged, sorted list of all plans', async () => {
    const page = makePage([makePlan()]);
    respond(200, page);

    await expect(
      getPlans({ ...filters, page: 2, sort: { field: 'name', dir: 'asc' } })
    ).resolves.toEqual(page);

    expect(lastRequest()).toEqual({
      path: '/api/plans',
      params: { page: '2', size: '10', sort: 'name,asc' }
    });
    expect(fetchMock.mock.calls[0][1]).toEqual({ cache: 'no-store' });
  });

  it('uses the active endpoint for the active filter', async () => {
    respond(200, makePage([]));
    await getPlans({ ...filters, status: 'active' });
    expect(lastRequest().path).toBe('/api/plans/active');
  });

  it('passes the requested page size through', async () => {
    respond(200, makePage([]));
    await getPlans({ ...filters, size: 50 });
    expect(lastRequest().params.size).toBe('50');
  });

  it('falls back to the default sort for a field the API cannot sort by', async () => {
    respond(200, makePage([]));
    await getPlans({ ...filters, sort: { field: 'bogus', dir: 'asc' } as never });
    expect(lastRequest().params.sort).toBe('id,desc');
  });

  it('normalises an unexpected direction and out-of-range paging values', async () => {
    respond(200, makePage([]));
    await getPlans({
      page: -3,
      size: 100000,
      status: 'all',
      sort: { field: 'name', dir: 'sideways' as never }
    });
    expect(lastRequest().params).toEqual({ page: '0', size: '100', sort: 'name,desc' });
  });

  it('throws when the API responds with an error', async () => {
    respond(500, {});
    await expect(getPlans(filters)).rejects.toThrow('Billing API responded with 500');
  });
});

describe('createPlan', () => {
  const payload = toPayload(makePlan());

  it('POSTs the JSON body to /api/plans and returns the created plan', async () => {
    const created = makePlan({ id: 99 });
    respond(201, created);

    await expect(createPlan(payload)).resolves.toEqual({
      ok: true,
      data: created
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/api/plans`);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body)).toEqual(payload);
  });

  it('maps a 400 to field errors the form can show', async () => {
    respond(400, {
      error: 'Validation Failed',
      fieldErrors: { name: 'Plan name is required' }
    });

    await expect(createPlan(payload)).resolves.toEqual({
      ok: false,
      status: 400,
      message: 'Validation Failed',
      fieldErrors: { name: 'Plan name is required' }
    });
  });

  it('reports an unreachable service instead of throwing', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(createPlan(payload)).resolves.toEqual({
      ok: false,
      status: 0,
      message: 'Billing service is unreachable'
    });
  });
});

describe('updatePlan', () => {
  it('PUTs the full body to /api/plans/{id} with the id only in the URL', async () => {
    const plan = makePlan({ id: 52 });
    respond(200, plan);

    await expect(updatePlan(52, toPayload(plan))).resolves.toEqual({
      ok: true,
      data: plan
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/api/plans/52`);
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).not.toHaveProperty('id');
  });

  it('explains that a 404 may be any service error', async () => {
    respond(404, {});
    const result = await updatePlan(52, toPayload(makePlan()));
    expect(result).toMatchObject({
      ok: false,
      status: 404,
      message: 'Plan not found, or the billing service failed'
    });
  });

  it('tolerates an error response without a JSON body', async () => {
    respond(502, undefined);
    const result = await updatePlan(52, toPayload(makePlan()));
    expect(result).toMatchObject({
      ok: false,
      status: 502,
      message: 'Billing API responded with 502'
    });
  });
});

describe('deletePlan', () => {
  it('sends DELETE without a body', async () => {
    respond(200, makePlan());
    await deletePlan(5);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/api/plans/5`);
    expect(init.method).toBe('DELETE');
    expect(init.body).toBeUndefined();
  });
});
