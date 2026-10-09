import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPlan, deletePlan, getPlans, updatePlan } from '@/features/billing/api/service';
import { toPayload } from '@/features/billing/lib/plan-payload';
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

describe('getPlans', () => {
  it('requests the paged list of all plans', async () => {
    const page = makePage([makePlan()]);
    respond(200, page);

    await expect(getPlans({ page: 2, size: 10, status: 'all' })).resolves.toEqual(page);
    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/api/plans?page=2&size=10`, {
      cache: 'no-store'
    });
  });

  it('uses the active endpoint for the active filter', async () => {
    respond(200, makePage([]));
    await getPlans({ page: 0, size: 10, status: 'active' });
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/api/plans/active?page=0&size=10`);
  });

  it('throws when the API responds with an error', async () => {
    respond(500, {});
    await expect(getPlans({ page: 0, size: 10, status: 'all' })).rejects.toThrow(
      'Billing API responded with 500'
    );
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
