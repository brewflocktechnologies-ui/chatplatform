import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getClientId, fetchClientConfig } from '../../utils/config.js';

describe('utils/config.ts', () => {
  beforeEach(() => {
    delete (window as any).ZOTLY_CLIENT_ID;
    document.body.innerHTML = '';
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return ZOTLY_CLIENT_ID if set on global window', () => {
    (window as any).ZOTLY_CLIENT_ID = 'client_123';
    expect(getClientId()).toBe('client_123');
  });

  it('should read data-client-id from script tag if set', () => {
    const script = document.createElement('script');
    script.setAttribute('data-client-id', 'client_script_456');
    document.body.appendChild(script);

    expect(getClientId()).toBe('client_script_456');
  });

  it('should read client_id or clientId from query param of script tag src', () => {
    const script = document.createElement('script');
    script.type = 'text/plain';
    script.setAttribute('src', 'http://localhost/index.js?client_id=client_param_789');
    document.body.appendChild(script);

    expect(getClientId()).toBe('client_param_789');

    document.body.innerHTML = '';
    const script2 = document.createElement('script');
    script2.type = 'text/plain';
    script2.setAttribute('src', 'http://localhost/widget.js?clientId=client_param_abc');
    document.body.appendChild(script2);

    expect(getClientId()).toBe('client_param_abc');
  });

  it('should fall back to default if no client ID is found', () => {
    expect(getClientId()).toBe('default');
  });

  it('should read from localStorage when test=true is in URL search', async () => {
    delete (window as any).location;
    (window as any).location = new URL('http://localhost/?test=true');

    const tempConfig = {
      accentColor: '#123456',
      bubble: { width: 50 },
      chatWindow: { clientName: 'Test Client' },
    };
    localStorage.setItem('zotly_temp_preview_config', JSON.stringify(tempConfig));

    const res = await fetchClientConfig('default');
    expect(res.accentColor).toBe('#123456');
    expect(res.bubbleConfig).toEqual({ width: 50 });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem('zotly_temp_preview_config', 'invalid json');
    const resErr = await fetchClientConfig('default');
    expect(resErr).toBeDefined();
    warnSpy.mockRestore();
  });

  it('should return client configs from server on successful fetch', async () => {
    const mockData = {
      bubble: { width: 60 },
      chatWindow: { accentColor: '#0b5fff' },
      chatbar: { text: 'Help' },
      greetWindow: { enabled: true },
      features: { voiceCallEnabled: true },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);

    const configs = await fetchClientConfig('client_123');
    expect(configs.bubbleConfig).toEqual({ width: 60 });
    expect(configs.chatConfig).toEqual({ accentColor: '#0b5fff' });
    expect(configs.chatbarConfig).toEqual({ text: 'Help' });
  });

  it('should return empty configs if all fetches fail or return non-object JSON', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => null,
    } as Response);
    const configsNull = await fetchClientConfig('nonexistent');
    expect(configsNull.bubbleConfig).toEqual({});

    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const configs = await fetchClientConfig('nonexistent');
    expect(configs.bubbleConfig).toEqual({});
    expect(configs.chatConfig).toEqual({});
  });

  it('should resolve accentColor from chat object fallback', async () => {
    const mockData = {
      chat: { accentColor: '#ff0055' },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);

    const configs = await fetchClientConfig('test_accent');
    expect(configs.accentColor).toBe('#ff0055');
  });

  it('handles script tag with invalid URL in getClientId', () => {
    const script = document.createElement('script');
    script.setAttribute('src', 'http://invalid-url-with-bad-search');
    vi.spyOn(window, 'URL').mockImplementationOnce(() => { throw new Error('Bad URL'); });
    document.body.appendChild(script);
    expect(getClientId()).toBe('default');
  });

  it('uses empty config fallbacks and the chat fallback in preview mode', async () => {
    delete (window as any).location;
    (window as any).location = new URL('http://localhost/?test=true');

    // Preview token missing bubble/chatWindow/chat sections → {} fallbacks
    localStorage.setItem('zotly_temp_preview_config', JSON.stringify({ accentColor: '#123456' }));
    let res = await fetchClientConfig('default');
    expect(res.bubbleConfig).toEqual({});
    expect(res.chatConfig).toEqual({});

    // Preview token with only chat (chatWindow missing → chat fallback)
    localStorage.setItem('zotly_temp_preview_config', JSON.stringify({ chat: { accentColor: '#ff0055' } }));
    res = await fetchClientConfig('default');
    expect(res.bubbleConfig).toEqual({});
    expect(res.chatConfig).toEqual({ accentColor: '#ff0055' });
  });

  it('returns empty configs when every candidate fetch responds with non-ok', async () => {
    delete (window as any).location;
    (window as any).location = new URL('http://localhost/');

    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false } as Response);
    const res = await fetchClientConfig('nonexistent');
    expect(res.bubbleConfig).toEqual({});
    expect(res.chatConfig).toEqual({});
  });
});
