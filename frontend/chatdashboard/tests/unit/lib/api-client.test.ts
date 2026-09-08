import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/lib/api-client';

describe('apiClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches from the /api base url with json headers and returns the body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ hello: 'world' })
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiClient<{ hello: string }>('/users')).resolves.toEqual({ hello: 'world' });
    expect(fetchMock).toHaveBeenCalledWith('/api/users', {
      headers: { 'Content-Type': 'application/json' }
    });
  });

  it('spreads extra request options', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(null)
    });
    vi.stubGlobal('fetch', fetchMock);

    await apiClient('/users', { method: 'POST', body: '{}' });
    expect(fetchMock).toHaveBeenCalledWith('/api/users', {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: '{}'
    });
  });

  it('throws with status details when the response is not ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.resolve({})
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiClient('/missing')).rejects.toThrow('API error: 404 Not Found');
  });
});
