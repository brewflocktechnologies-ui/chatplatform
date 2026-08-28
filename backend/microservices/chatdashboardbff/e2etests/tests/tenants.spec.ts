import { test, expect } from '@playwright/test';

// Black-box E2E over the real chain: BFF REST -> gRPC -> accountservice ->
// R2DBC -> the shared Postgres tenant table. Nothing is mocked - these tests
// prove the same contracts the unit/slice tests assert, end to end.
//
// Unique slug per run (regex-constrained to ^[a-z0-9-]{3,32}$) so runs never
// collide with each other or leftover data; afterAll deletes whatever the run
// created even when a mid-suite test fails.

const slug = `e2e-${Date.now().toString(36)}`;
let tenantId: string | undefined;

test.afterAll(async ({ request }) => {
  if (tenantId) {
    await request.delete(`/api/v1/tenants/${tenantId}`); // 204 or 404, both fine
  }
});

test.describe('tenant CRUD lifecycle', () => {
  test('POST creates a tenant with server-stamped fields', async ({ request }) => {
    const response = await request.post('/api/v1/tenants', {
      data: { slug, name: 'E2E Tenant' },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.tenantId).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.slug).toBe(slug);
    expect(body.name).toBe('E2E Tenant');
    expect(body.status).toBe('ACTIVE'); // defaulted, not sent
    expect(body.version).toBe(0);
    expect(body.createdBy).toBe('system');
    expect(body.createdAt).toBeTruthy();
    tenantId = body.tenantId;
  });

  test('POST duplicate slug returns 409 problem+json', async ({ request }) => {
    const response = await request.post('/api/v1/tenants', {
      data: { slug, name: 'E2E Tenant Again' },
    });
    expect(response.status()).toBe(409);
    const problem = await response.json();
    expect(problem.title).toBe('Conflict');
    expect(problem.detail).toContain(slug);
  });

  test('GET returns the created tenant', async ({ request }) => {
    const response = await request.get(`/api/v1/tenants/${tenantId}`);
    expect(response.status()).toBe(200);
    expect((await response.json()).slug).toBe(slug);
  });

  test('LIST contains the created tenant in a page envelope', async ({ request }) => {
    const response = await request.get('/api/v1/tenants?page=0&size=50');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.page).toBe(0);
    expect(body.totalElements).toBeGreaterThanOrEqual(1);
    expect(body.content.map((t: { slug: string }) => t.slug)).toContain(slug);
  });

  test('PUT updates name/status and bumps the optimistic-lock version', async ({ request }) => {
    const response = await request.put(`/api/v1/tenants/${tenantId}`, {
      data: { name: 'E2E Renamed', status: 'SUSPENDED' },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.name).toBe('E2E Renamed');
    expect(body.status).toBe('SUSPENDED');
    expect(body.version).toBe(1);
    expect(body.slug).toBe(slug); // immutable
  });

  test('DELETE removes the tenant, second GET is 404', async ({ request }) => {
    const del = await request.delete(`/api/v1/tenants/${tenantId}`);
    expect(del.status()).toBe(204);
    const after = await request.get(`/api/v1/tenants/${tenantId}`);
    expect(after.status()).toBe(404);
    tenantId = undefined; // nothing left for afterAll
  });
});

test.describe('error contracts', () => {
  test('invalid slug returns 400 with fieldErrors', async ({ request }) => {
    const response = await request.post('/api/v1/tenants', {
      data: { slug: 'NOT VALID', name: 'x' },
    });
    expect(response.status()).toBe(400);
    const problem = await response.json();
    expect(problem.title).toBe('Bad Request');
    expect(problem.fieldErrors.slug).toBeTruthy();
  });

  test('malformed UUID in path returns 400', async ({ request }) => {
    const response = await request.get('/api/v1/tenants/not-a-uuid');
    expect(response.status()).toBe(400);
  });

  test('unknown tenant returns 404 problem+json', async ({ request }) => {
    const response = await request.get(
      '/api/v1/tenants/00000000-0000-0000-0000-000000000000',
    );
    expect(response.status()).toBe(404);
    expect((await response.json()).title).toBe('Not Found');
  });

  test('update of unknown tenant returns 404', async ({ request }) => {
    const response = await request.put(
      '/api/v1/tenants/00000000-0000-0000-0000-000000000000',
      { data: { name: 'x', status: 'ACTIVE' } },
    );
    expect(response.status()).toBe(404);
  });
});

test.describe('API contract surface', () => {
  test('OpenAPI document is served and matches the committed contract paths', async ({
    request,
  }) => {
    const response = await request.get('/v3/api-docs');
    expect(response.status()).toBe(200);
    const api = await response.json();
    expect(Object.keys(api.paths).sort()).toEqual([
      '/api/v1/tenants',
      '/api/v1/tenants/{tenantId}',
    ]);
  });
});
