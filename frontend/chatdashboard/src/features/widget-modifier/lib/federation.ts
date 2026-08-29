'use client';

// ============================================================
// Module-federation helpers for the widget customization MFE
// ============================================================
// The chatwidget-customization app is a Vite module-federation remote
// exposing `./mount` (mount/unmount an iframe-based customization UI).
// The host talks to that iframe over postMessage:
//   host → MFE: LOAD_WIDGET_CONFIG, UPDATE_PREVIEW_DOMAIN,
//               RESET_WIDGET_PREVIEW, REQUEST_WIDGET_CONFIG
//   MFE → host: MFE_READY, WIDGET_CONFIG_CHANGED, SAVE_WIDGET_CONFIG
// ============================================================

import { useEffect, useState } from 'react';

export type RemoteMountModule = {
  mount: (el: HTMLElement, options?: Record<string, unknown>) => void | Promise<void>;
  unmount?: (el: HTMLElement) => void;
};

const EMPTY_SHARE_SCOPE = {};

// The MFE renders an srcdoc iframe with this class; srcdoc frames share the
// host origin, so targeting our own origin is the strictest safe option.
export function postToWidgetFrame(type: string, payload: Record<string, unknown> = {}): boolean {
  try {
    const iframe = document.querySelector<HTMLIFrameElement>('.cw-customization-frame');
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type, ...payload }, window.location.origin);
      return true;
    }
  } catch {
    // frame not ready yet
  }
  return false;
}

// Unwraps nested cdnConfig wrappers and strips document metadata so only the
// widget-facing config is compared/saved.
export function unwrapCdnConfig(config: unknown): Record<string, unknown> {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return {};
  let clean = config as Record<string, unknown>;
  while (
    clean.cdnConfig &&
    typeof clean.cdnConfig === 'object' &&
    !Array.isArray(clean.cdnConfig)
  ) {
    clean = clean.cdnConfig as Record<string, unknown>;
  }
  const result = JSON.parse(JSON.stringify(clean)) as Record<string, unknown>;
  for (const key of [
    'websiteId',
    'customerId',
    'customerName',
    'domain',
    'configName',
    'name',
    '_id',
    'id',
    'createdAt',
    'updatedAt'
  ]) {
    delete result[key];
  }
  return result;
}

// Key-order-insensitive stringify, for comparing config payloads the MFE
// re-emits in its own property order.
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .toSorted()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

// Loads a Vite module-federation remote at runtime. Uses a Function-wrapped
// dynamic import so the Next bundler doesn't try to resolve the URL at build
// time, and caches per remote URL so remounts don't re-fetch the entry.
const remoteCache = new Map<string, Promise<RemoteMountModule>>();

async function loadRemote(remoteUrl: string, moduleName: string): Promise<RemoteMountModule> {
  const load = new Function('u', 'return import(u)') as (u: string) => Promise<{
    init?: (scope: object) => Promise<void>;
    get: (name: string) => Promise<() => RemoteMountModule>;
  }>;

  const remote =
    (await load(`${remoteUrl}/assets/remoteEntry.js`).catch(() => null)) ||
    (await load(`${remoteUrl}/remoteEntry.js`));

  if (remote.init) {
    try {
      await remote.init(EMPTY_SHARE_SCOPE);
    } catch {
      // share scope already initialized
    }
  }
  const factory = await remote.get(moduleName);
  return factory();
}

export function useViteRemote(remoteUrl: string, moduleName: string) {
  const [mod, setMod] = useState<RemoteMountModule | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = `${remoteUrl}::${moduleName}`;
    let promise = remoteCache.get(cacheKey);
    if (!promise) {
      promise = loadRemote(remoteUrl, moduleName);
      remoteCache.set(cacheKey, promise);
    }
    promise
      .then((m) => {
        if (!cancelled) setMod(m);
      })
      .catch((err: Error) => {
        remoteCache.delete(cacheKey);
        if (!cancelled) setError(err);
      });
    return () => {
      cancelled = true;
    };
  }, [remoteUrl, moduleName]);

  return { mod, error };
}
