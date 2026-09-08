import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ACTIVE_WIDGET_ENV,
  WIDGET_ENDPOINTS,
  EXTERNAL_URLS,
  getActiveWidgetEnv,
  setActiveWidgetEnv,
  getWidgetCustomizationMfeUrl,
  getChatWidgetUrl,
  buildEmbedCode
} from '@/config/external-urls';

beforeEach(() => {
  window.localStorage.clear();
  vi.stubEnv('NEXT_PUBLIC_WIDGET_CUSTOMIZATION_ENV', undefined);
  vi.stubEnv('NEXT_PUBLIC_WIDGET_CUSTOMIZATION_URL', undefined);
  vi.stubEnv('NEXT_PUBLIC_CHAT_WIDGET_URL', undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe('constants', () => {
  it('defaults to the prod environment', () => {
    expect(ACTIVE_WIDGET_ENV).toBe('prod');
  });

  it('exposes local and prod endpoints for every widget asset', () => {
    expect(WIDGET_ENDPOINTS.customizationMfe.local).toBe('http://localhost:5001');
    expect(WIDGET_ENDPOINTS.customizationMfe.prod).toContain('https://');
    expect(WIDGET_ENDPOINTS.chatWidget.local).toContain('chat-widget.js');
    expect(WIDGET_ENDPOINTS.chatWidget.prod).toContain('chat-widget.js');
    expect(WIDGET_ENDPOINTS.deployRoot.local).toBe('http://localhost:5001');
    expect(WIDGET_ENDPOINTS.deployRoot.prod).toContain('https://');
  });

  it('EXTERNAL_URLS mirror the prod endpoints', () => {
    expect(EXTERNAL_URLS.chatWidgetCdn).toBe(WIDGET_ENDPOINTS.chatWidget.prod);
    expect(EXTERNAL_URLS.widgetDeployRoot).toBe(WIDGET_ENDPOINTS.deployRoot.prod);
  });
});

describe('getActiveWidgetEnv', () => {
  it('prefers a valid localStorage value of local', () => {
    window.localStorage.setItem('widget_env', 'local');
    expect(getActiveWidgetEnv()).toBe('local');
  });

  it('prefers a valid localStorage value of prod', () => {
    window.localStorage.setItem('widget_env', 'prod');
    expect(getActiveWidgetEnv()).toBe('prod');
  });

  it('ignores an invalid localStorage value and falls back to the default', () => {
    window.localStorage.setItem('widget_env', 'staging');
    expect(getActiveWidgetEnv()).toBe(ACTIVE_WIDGET_ENV);
  });

  it('uses the env var when localStorage is empty (local)', () => {
    vi.stubEnv('NEXT_PUBLIC_WIDGET_CUSTOMIZATION_ENV', 'local');
    expect(getActiveWidgetEnv()).toBe('local');
  });

  it('uses the env var when localStorage is empty (prod)', () => {
    vi.stubEnv('NEXT_PUBLIC_WIDGET_CUSTOMIZATION_ENV', 'prod');
    expect(getActiveWidgetEnv()).toBe('prod');
  });

  it('ignores an invalid env var value', () => {
    vi.stubEnv('NEXT_PUBLIC_WIDGET_CUSTOMIZATION_ENV', 'staging');
    expect(getActiveWidgetEnv()).toBe(ACTIVE_WIDGET_ENV);
  });

  it('skips localStorage entirely when window is undefined', () => {
    vi.stubEnv('NEXT_PUBLIC_WIDGET_CUSTOMIZATION_ENV', 'local');
    vi.stubGlobal('window', undefined);
    expect(getActiveWidgetEnv()).toBe('local');
  });
});

describe('setActiveWidgetEnv', () => {
  it('persists the env in localStorage', () => {
    setActiveWidgetEnv('local');
    expect(window.localStorage.getItem('widget_env')).toBe('local');
    expect(getActiveWidgetEnv()).toBe('local');
  });

  it('is a no-op when window is undefined', () => {
    const storage = window.localStorage;
    vi.stubGlobal('window', undefined);
    expect(() => setActiveWidgetEnv('local')).not.toThrow();
    vi.unstubAllGlobals();
    expect(storage.getItem('widget_env')).toBeNull();
  });
});

describe('getWidgetCustomizationMfeUrl', () => {
  it('returns the explicit override URL when set', () => {
    vi.stubEnv('NEXT_PUBLIC_WIDGET_CUSTOMIZATION_URL', 'https://example.com/mfe');
    expect(getWidgetCustomizationMfeUrl()).toBe('https://example.com/mfe');
  });

  it('resolves the local endpoint for the local env', () => {
    window.localStorage.setItem('widget_env', 'local');
    expect(getWidgetCustomizationMfeUrl()).toBe(WIDGET_ENDPOINTS.customizationMfe.local);
  });

  it('resolves the prod endpoint by default', () => {
    expect(getWidgetCustomizationMfeUrl()).toBe(WIDGET_ENDPOINTS.customizationMfe.prod);
  });
});

describe('getChatWidgetUrl', () => {
  it('returns the explicit override URL when set', () => {
    vi.stubEnv('NEXT_PUBLIC_CHAT_WIDGET_URL', 'https://example.com/widget.js');
    expect(getChatWidgetUrl()).toBe('https://example.com/widget.js');
  });

  it('resolves the local endpoint for the local env', () => {
    window.localStorage.setItem('widget_env', 'local');
    expect(getChatWidgetUrl()).toBe(WIDGET_ENDPOINTS.chatWidget.local);
  });

  it('resolves the prod endpoint by default', () => {
    expect(getChatWidgetUrl()).toBe(WIDGET_ENDPOINTS.chatWidget.prod);
  });
});

describe('buildEmbedCode', () => {
  it('produces a two-line snippet referencing the widget loader and website id', () => {
    const code = buildEmbedCode('site-123');
    const lines = code.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('<!-- BrewFlock Chat Widget -->');
    expect(lines[1]).toContain(`${EXTERNAL_URLS.widgetDeployRoot}/widget-loader.js`);
    expect(lines[1]).toContain('data-website-id="site-123"');
  });
});
