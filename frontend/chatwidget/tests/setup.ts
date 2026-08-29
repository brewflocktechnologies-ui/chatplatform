import { vi } from 'vitest';

if (!globalThis.fetch || (globalThis.fetch as any)._isMockFunction !== true) {
  globalThis.fetch = vi.fn().mockImplementation(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '',
      blob: async () => new Blob([]),
    } as Response)
  );
}
