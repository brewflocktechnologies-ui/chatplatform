import { vi } from 'vitest';

// The app fetches preset JSON and forms.html at startup. Tests run offline:
// default every fetch to a graceful 404 so the app exercises its fallback
// paths. Individual tests override this mock when they need real payloads.
vi.stubGlobal('fetch', vi.fn(async () => ({
  ok: false,
  status: 404,
  json: async () => ({}),
  text: async () => ''
})));

// happy-dom has no alert(); the app uses it for JSON-editor errors.
vi.stubGlobal('alert', vi.fn());
