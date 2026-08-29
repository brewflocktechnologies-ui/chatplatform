/**
 * Smoke/integration tests: evaluate the real production scripts (src/core.js +
 * scripts.js) in a DOM the way the standalone page and the federation mount do
 * (classic-script semantics via indirect eval), then drive the postMessage
 * surface end-to-end.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const coreSource = readFileSync(join(here, '..', 'src', 'core.js'), 'utf8');
const scriptsSource = readFileSync(join(here, '..', 'scripts.js'), 'utf8');

const SELF_ORIGIN = window.origin || window.location.origin;
const ATTACKER = 'https://evil.example.net';

function dispatchHostMessage(origin, data) {
  const event = new window.MessageEvent('message', { data, origin });
  // MessageEvent 'source' is read-only and unset when constructed manually;
  // the trust policy requires source === window.parent (which is `window`
  // itself in the test environment, as in a standalone page).
  Object.defineProperty(event, 'source', { value: window.parent });
  window.dispatchEvent(event);
}

beforeAll(() => {
  // Give the app the DOM node it updates on domain messages.
  const addressBar = document.createElement('div');
  addressBar.className = 'chrome-address-bar';
  addressBar.innerHTML = '<span>preview.local</span>';
  document.body.appendChild(addressBar);

  // Classic-script evaluation, exactly like <script src> / runInFrameClassic.
  window.eval(coreSource);
  window.eval(scriptsSource);
});

describe('script evaluation (app boot)', () => {
  it('defines the CWCore namespace and the public app entry points', () => {
    expect(window.CWCore).toBeTypeOf('object');
    expect(window.updateAddressBarDomain).toBeTypeOf('function');
    expect(window.__initCustomizationApp).toBeTypeOf('function');
    expect(window.__initWidgetPreviewOnly).toBeTypeOf('function');
  });

  it('exports every function referenced by inline HTML handlers to window', () => {
    // index.html wires these via on*="..." attributes, which resolve globally;
    // when scripts.js loads as a module they must be explicit window exports.
    for (const name of [
      'toggleNotifCard', 'updateNotifCounter', 'adjustNotifStepper',
      'selectNotifPromptStyle', 'selectNotifPresetIcon', 'handleNotifIconUpload',
      'triggerNotifPreviewUpdate', 'toggleFormSectionCard', 'toggleFeaturesCard'
    ]) {
      expect(window[name], `window.${name} missing`).toBeTypeOf('function');
    }
  });
});

describe('postMessage surface (end-to-end through the real listener)', () => {
  it('applies a trusted LOAD_WIDGET_CONFIG to global config state', () => {
    dispatchHostMessage(SELF_ORIGIN, {
      type: 'LOAD_WIDGET_CONFIG',
      cdnConfig: { cdnConfig: { clientId: 'smoke-test', accentColor: '#123456' } }
    });
    expect(window.cutomizationConfig).toBeTruthy();
    expect(window.cutomizationConfig.clientId).toBe('smoke-test');
  });

  it('updates the preview address bar from a trusted UPDATE_PREVIEW_DOMAIN', () => {
    dispatchHostMessage(SELF_ORIGIN, {
      type: 'UPDATE_PREVIEW_DOMAIN',
      domain: 'customer-site.example'
    });
    const span = document.querySelector('.chrome-address-bar span');
    expect(span.textContent).toBe('customer-site.example');
  });

  it('rejects config injection from an untrusted origin', () => {
    const before = window.cutomizationConfig;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    dispatchHostMessage(ATTACKER, {
      type: 'LOAD_WIDGET_CONFIG',
      cdnConfig: { clientId: 'attacker', accentColor: 'red' }
    });
    expect(window.cutomizationConfig).toBe(before);
    expect(window.cutomizationConfig?.clientId).not.toBe('attacker');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('rejects a structurally invalid config even from the trusted origin', () => {
    const before = window.cutomizationConfig;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    dispatchHostMessage(SELF_ORIGIN, {
      type: 'LOAD_WIDGET_CONFIG',
      cdnConfig: { clientId: 999, bubble: 'not-an-object' }
    });
    expect(window.cutomizationConfig).toBe(before);
    warn.mockRestore();
  });

  it('blocks prototype pollution delivered via host config', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    dispatchHostMessage(SELF_ORIGIN, {
      type: 'LOAD_WIDGET_CONFIG',
      cdnConfig: JSON.parse('{"clientId":"x","features":{"__proto__":{"polluted":true}}}')
    });
    expect({}.polluted).toBeUndefined();
    expect(window.cutomizationConfig?.clientId).not.toBe('x');
    warn.mockRestore();
  });

  it('ignores messages from a non-parent source window', () => {
    const before = window.cutomizationConfig;
    const event = new window.MessageEvent('message', {
      data: { type: 'LOAD_WIDGET_CONFIG', cdnConfig: { clientId: 'spoofed' } },
      origin: SELF_ORIGIN
    });
    Object.defineProperty(event, 'source', { value: { fake: 'window' } });
    window.dispatchEvent(event);
    expect(window.cutomizationConfig).toBe(before);
  });
});

describe('DOM helpers', () => {
  it('updateAddressBarDomain ignores non-string input', () => {
    const span = document.querySelector('.chrome-address-bar span');
    const before = span.textContent;
    window.updateAddressBarDomain({ evil: true });
    window.updateAddressBarDomain(null);
    expect(span.textContent).toBe(before);
  });
});
