import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createPocWidget,
  deletePocWidget,
  updatePocWidget
} from '@/features/poc-widget/api/service';
import type { PocWidgetMutationPayload } from '@/features/poc-widget/api/types';

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

const payload: PocWidgetMutationPayload = {
  companyId: 702,
  assistantId: 3952,
  widgetName: 'Support widget',
  websiteUrl: 'https://example.com',
  position: 'BOTTOM_RIGHT',
  theme: 'LIGHT',
  primaryColor: '#007bff',
  greetingMessage: 'Hello!',
  offlineMessage: null,
  showAgentName: true,
  showTypingIndicator: true,
  enableFileUpload: false,
  maxFileSizeMb: 10,
  enableSoundNotification: true,
  autoPopup: false,
  popupDelaySeconds: null,
  isActive: true
};

function lastRequest() {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  return { url: url as string, init };
}

describe('createPocWidget', () => {
  it('POSTs the payload', async () => {
    respond(201, { id: 1, ...payload });

    await expect(createPocWidget(payload)).resolves.toMatchObject({ ok: true });

    const { url, init } = lastRequest();
    expect(url).toBe(`${BASE}/api/chat-assistant/widgets`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(payload);
  });

  it('returns API field errors as data', async () => {
    respond(400, { message: 'Input validation errors', fieldErrors: { widgetName: 'blank' } });

    await expect(createPocWidget(payload)).resolves.toEqual({
      ok: false,
      status: 400,
      message: 'Input validation errors',
      fieldErrors: { widgetName: 'blank' }
    });
  });

  it('rejects an unknown theme or position without calling the API', async () => {
    const result = await createPocWidget({
      ...payload,
      theme: 'AUTO' as never,
      position: 'MIDDLE' as never
    });

    expect(result).toMatchObject({
      ok: false,
      status: 400,
      fieldErrors: { theme: 'Unknown theme', position: 'Unknown position' }
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('updatePocWidget', () => {
  it('PUTs to the widget path with a truncated id', async () => {
    respond(200, { id: 7, ...payload });

    await updatePocWidget(7.9, payload);

    const { url, init } = lastRequest();
    expect(url).toBe(`${BASE}/api/chat-assistant/widgets/7`);
    expect(init.method).toBe('PUT');
  });

  it('rejects an unknown theme without calling the API', async () => {
    await expect(updatePocWidget(7, { ...payload, theme: 'AUTO' as never })).resolves.toMatchObject(
      { ok: false, fieldErrors: { theme: 'Unknown theme' } }
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('deletePocWidget', () => {
  it('DELETEs without a body', async () => {
    respond(204, undefined);

    await expect(deletePocWidget(7)).resolves.toMatchObject({ ok: true });

    const { url, init } = lastRequest();
    expect(url).toBe(`${BASE}/api/chat-assistant/widgets/7`);
    expect(init.method).toBe('DELETE');
    expect(init.body).toBeUndefined();
  });

  it('maps a 404 to a readable message', async () => {
    respond(404, undefined);

    await expect(deletePocWidget(7)).resolves.toMatchObject({
      ok: false,
      status: 404,
      message: 'Widget not found'
    });
  });
});
