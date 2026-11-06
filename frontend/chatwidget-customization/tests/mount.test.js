import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, resolveChatWidgetHost } from '../src/mount.js';

function fakeFrameEnv(iframe) {
  const frameDoc = document.implementation.createHTMLDocument('frame');
  const frameWin = {
    lucide: { createIcons: vi.fn() },
    updateAlpineStores: vi.fn(),
    cutomizationConfig: { a: 1 },
    ChatWidgetLit: { chatStore: { get: () => state } },
    eval: undefined
  };
  const state = { darkMode: false };
  Object.defineProperty(iframe, 'contentDocument', { value: frameDoc, configurable: true });
  Object.defineProperty(iframe, 'contentWindow', { value: frameWin, configurable: true });
  return { frameDoc, frameWin, state };
}

let host;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  document.documentElement.classList.remove('dark');
  document.body.classList.remove('dark');
});

afterEach(() => {
  unmount(host);
  host.remove();
  document.documentElement.classList.remove('dark');
  document.body.classList.remove('dark');
});

describe('mount', () => {
  it('ignores a missing element', async () => {
    await expect(mount(null)).resolves.toBeUndefined();
  });

  it('creates a titled iframe with a srcdoc document and marks the host', async () => {
    await mount(host);
    const iframe = host.querySelector('iframe.cw-customization-frame');
    expect(iframe).not.toBeNull();
    expect(iframe.getAttribute('title')).toBe('Widget Customization');
    expect(host.dataset.cwMounted).toBe('true');
    expect(iframe.srcdoc).toMatch(/^<!DOCTYPE html>/);
    expect(iframe.srcdoc).toContain('<title>Widget Customization</title>');
    expect(iframe.srcdoc).toContain('chat-widget.js');
    expect(iframe.srcdoc).toContain('alpinejs');
  });

  it('is idempotent for an already mounted host', async () => {
    await mount(host);
    await mount(host);
    expect(host.querySelectorAll('iframe')).toHaveLength(1);
  });

  it('uses a light background by default and a dark one when the host is dark', async () => {
    await mount(host);
    expect(host.querySelector('iframe').style.background).toMatch(/#fff|rgb\(255, 255, 255\)|white/);
    unmount(host);
    document.documentElement.classList.add('dark');
    await mount(host);
    expect(host.querySelector('iframe').style.background).toMatch(/#000|rgb\(0, 0, 0\)|black/);
  });

  it('reacts to host dark-mode class changes', async () => {
    await mount(host);
    const iframe = host.querySelector('iframe');
    const { frameDoc, state } = fakeFrameEnv(iframe);
    document.body.classList.add('dark');
    await new Promise((r) => setTimeout(r, 0));
    expect(frameDoc.documentElement.classList.contains('dark')).toBe(true);
    expect(frameDoc.body.classList.contains('dark-mode')).toBe(true);
    expect(state.darkMode).toBe(true);
    document.body.classList.remove('dark');
    await new Promise((r) => setTimeout(r, 0));
    expect(frameDoc.documentElement.classList.contains('dark')).toBe(false);
    expect(state.darkMode).toBe(false);
  });

  it('treats a dark mount element as dark', async () => {
    host.classList.add('dark');
    await mount(host);
    const iframe = host.querySelector('iframe');
    const { frameDoc } = fakeFrameEnv(iframe);
    document.body.classList.add('x'); // trigger observer
    document.body.classList.remove('x');
    await new Promise((r) => setTimeout(r, 0));
    expect(frameDoc.documentElement.classList.contains('dark')).toBe(true);
  });
});

describe('iframe onload', () => {
  it('initialises the frame once, wires globals and runs core + scripts', async () => {
    const cdnConfig = { theme: 'x' };
    await mount(host, { cdnConfig, foo: 'bar' });
    const iframe = host.querySelector('iframe');
    const { frameDoc, frameWin } = fakeFrameEnv(iframe);

    iframe.onload();

    expect(frameWin.__CW_INITIALIZED__).toBe(true);
    expect(frameWin.__CUSTOMIZATION_ASSET_BASE__).toMatch(/\/$/);
    expect(frameWin.__CW_OPTIONS__).toEqual({ cdnConfig, foo: 'bar' });
    expect(frameWin.cutomizationConfig).toBe(cdnConfig);
    expect(frameWin.CW_TRUSTED_ORIGINS).toEqual([window.location.origin]);
    expect(frameWin.lucide.createIcons).toHaveBeenCalled();
    // core.js and scripts.js injected as classic scripts
    expect(frameDoc.head.querySelectorAll('script')).toHaveLength(2);

    // second load is a no-op
    iframe.onload();
    expect(frameDoc.head.querySelectorAll('script')).toHaveLength(2);
  });

  it('does nothing when the frame has no document or window', async () => {
    await mount(host);
    const iframe = host.querySelector('iframe');
    Object.defineProperty(iframe, 'contentDocument', { value: null, configurable: true });
    Object.defineProperty(iframe, 'contentWindow', { value: null, configurable: true });
    expect(() => iframe.onload()).not.toThrow();
  });

  it('tolerates lucide failures and missing lucide', async () => {
    await mount(host);
    const iframe = host.querySelector('iframe');
    const { frameWin } = fakeFrameEnv(iframe);
    frameWin.lucide.createIcons = () => { throw new Error('boom'); };
    expect(() => iframe.onload()).not.toThrow();
    expect(frameWin.__CW_INITIALIZED__).toBe(true);
  });

  it('works without options', async () => {
    await mount(host);
    const iframe = host.querySelector('iframe');
    const { frameWin } = fakeFrameEnv(iframe);
    frameWin.lucide = undefined;
    iframe.onload();
    expect(frameWin.__CW_OPTIONS__).toEqual({});
    expect(frameWin.cutomizationConfig).toEqual({ a: 1 });
  });
});

describe('unmount', () => {
  it('clears the host, disconnects the observer and allows remounting', async () => {
    await mount(host);
    const observer = host._cwDarkObserver;
    expect(observer).toBeDefined();
    const spy = vi.spyOn(observer, 'disconnect');
    unmount(host);
    expect(spy).toHaveBeenCalled();
    expect(host._cwDarkObserver).toBeUndefined();
    expect(host.innerHTML).toBe('');
    expect(host.dataset.cwMounted).toBeUndefined();
    await mount(host);
    expect(host.querySelectorAll('iframe')).toHaveLength(1);
  });

  it('ignores a missing element and an unmounted one', () => {
    expect(() => unmount(null)).not.toThrow();
    expect(() => unmount(document.createElement('div'))).not.toThrow();
  });
});

describe('resolveChatWidgetHost', () => {
  it('uses the local preview port for localhost and 127.0.0.1', () => {
    expect(resolveChatWidgetHost('localhost', 'http://localhost:5001/mount.js')).toBe(
      'http://localhost:4173'
    );
    expect(resolveChatWidgetHost('127.0.0.1', 'http://127.0.0.1:5001/mount.js')).toBe(
      'http://localhost:4173'
    );
  });

  it('resolves the bundled dist folder relative to the module when deployed', () => {
    expect(resolveChatWidgetHost('example.github.io', 'https://example.github.io/app/src/mount.js')).toBe(
      'https://example.github.io/app/dist'
    );
  });
});

describe('dark-mode sync tolerates partially initialised frames', () => {
  const flush = () => new Promise((r) => setTimeout(r, 0));

  it('skips the frame document when it has no documentElement', async () => {
    await mount(host);
    const iframe = host.querySelector('iframe');
    Object.defineProperty(iframe, 'contentDocument', { value: { documentElement: null }, configurable: true });
    Object.defineProperty(iframe, 'contentWindow', { value: {}, configurable: true });
    document.body.classList.add('dark');
    await flush();
    expect(iframe.style.background).toMatch(/#000|rgb\(0, 0, 0\)|black/);
  });

  it('skips the widget store and alpine refresh when they are not ready', async () => {
    await mount(host);
    const iframe = host.querySelector('iframe');
    const { frameWin } = fakeFrameEnv(iframe);
    frameWin.ChatWidgetLit = undefined;
    frameWin.updateAlpineStores = undefined;
    document.body.classList.add('dark');
    await flush();
    expect(iframe.style.background).toMatch(/#000|rgb\(0, 0, 0\)|black/);
  });

  it('refreshes alpine stores only when a customization config exists', async () => {
    await mount(host);
    const iframe = host.querySelector('iframe');
    const { frameWin } = fakeFrameEnv(iframe);
    frameWin.cutomizationConfig = undefined;
    document.body.classList.add('dark');
    await flush();
    expect(frameWin.updateAlpineStores).not.toHaveBeenCalled();
    frameWin.cutomizationConfig = { a: 1 };
    document.body.classList.remove('dark');
    await flush();
    expect(frameWin.updateAlpineStores).toHaveBeenCalledWith({ a: 1 });
  });

  it('swallows errors thrown while syncing a cross-origin frame', async () => {
    await mount(host);
    const iframe = host.querySelector('iframe');
    Object.defineProperty(iframe, 'contentDocument', {
      get() {
        throw new Error('cross-origin');
      },
      configurable: true
    });
    document.body.classList.add('dark');
    await expect(flush()).resolves.toBeUndefined();
  });
});
