/**
 * utils/config.ts
 * Port of window.ZotlyConfig from config.js
 */

import { getWidgetBaseUrl } from './theme.js';

export interface ClientConfigs {
  /** Shared widget-wide accent color. Root-level in the client JSON; falls
   *  back to the legacy `chatWindow.accentColor` placement for configs that
   *  haven't been migrated yet. */
  accentColor?: string;
  bubbleConfig: Record<string, unknown>;
  chatConfig: Record<string, unknown>;
  chatbarConfig: Record<string, unknown>;
  greetWindowConfig: Record<string, unknown>;
  featuresConfig: Record<string, unknown>;
}

/**
 * Resolves the shared accent color, preferring the root-level `accentColor`
 * key and falling back to the legacy nested `chatWindow.accentColor` (or
 * `chat.accentColor`) placement for backward compatibility.
 */
function resolveAccentColor(data: any): string | undefined {
  return data.accentColor || data.chatWindow?.accentColor || data.chat?.accentColor || undefined;
}

/**
 * Reads the client ID from window.ZOTLY_CLIENT_ID or from the widget
 * script tag's data-client-id attribute / URL query param.
 */
export function getClientId(): string {
  if ((window as any).ZOTLY_CLIENT_ID) return (window as any).ZOTLY_CLIENT_ID;

  const scriptTag =
    document.querySelector<HTMLScriptElement>('script[data-client-id]') ||
    document.querySelector<HTMLScriptElement>('script[src*="index.es.js"]') ||
    document.querySelector<HTMLScriptElement>('script[src*="index.umd.js"]') ||
    document.querySelector<HTMLScriptElement>('script[src*="index.js"]') ||
    document.querySelector<HTMLScriptElement>('script[src*="widget.js"]');

  if (scriptTag) {
    const dataId = scriptTag.getAttribute('data-client-id');
    if (dataId) return dataId;
    try {
      const url = new URL(scriptTag.src, window.location.href);
      const paramId = url.searchParams.get('client_id') || url.searchParams.get('clientId');
      if (paramId) return paramId;
    } catch (_) {
      /* ignore */
    }
  }
  return 'default';
}

/**
 * Fetches the client configuration from the server (or local storage if
 * ?test=true is present in the URL for the editor preview flow).
 */
export async function fetchClientConfig(clientId: string): Promise<ClientConfigs> {
  // Editor preview mode: read from localStorage
  if (window.location.search.includes('test=true')) {
    const temp = localStorage.getItem('zotly_temp_preview_config');
    if (temp) {
      try {
        const data = JSON.parse(temp);
        return {
          accentColor: resolveAccentColor(data),
          bubbleConfig: data.bubble || {},
          chatConfig: data.chatWindow || data.chat || {},
          chatbarConfig: data.chatbar || {},
          greetWindowConfig: data.greetWindow || {},
          featuresConfig: data.features || {},
        };
      } catch (err) {
        console.warn('Failed to parse temporary preview configuration:', err);
      }
    }
  }

  const baseUrl = getWidgetBaseUrl();
  /* v8 ignore next -- getWidgetBaseUrl() always returns a trailing-slash URL */
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const candidateUrls = [
    `${normalizedBase}clients/${clientId}.json`,
    `./clients/${clientId}.json`,
    `${normalizedBase}public/clients/${clientId}.json`,
    `./public/clients/${clientId}.json`,
    `${normalizedBase}clients/default.json`,
    `./clients/default.json`,
    `${normalizedBase}public/clients/default.json`,
    `./public/clients/default.json`,
  ];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          return {
            accentColor: resolveAccentColor(data),
            bubbleConfig: data.bubble || {},
            chatConfig: data.chatWindow || data.chat || {},
            chatbarConfig: data.chatbar || {},
            greetWindowConfig: data.greetWindow || {},
            featuresConfig: data.features || {},
          };
        }
      }
    } catch (_) {
      /* try next candidate URL */
    }
  }

  return { accentColor: undefined, bubbleConfig: {}, chatConfig: {}, chatbarConfig: {}, greetWindowConfig: {}, featuresConfig: {} };
}
