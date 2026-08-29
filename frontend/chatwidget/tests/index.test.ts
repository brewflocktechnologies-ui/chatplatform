import { describe, it, expect, vi } from 'vitest';
import { mountChatWidget, mountChatWidgetWithToken } from '../index.js';

describe('index entry point', () => {
  it('mounts chat widget into body if no container provided', () => {
    const root = mountChatWidget();
    expect(root).toBeDefined();
    expect(root.tagName.toLowerCase()).toBe('cw-widget-root');
    expect(document.body.contains(root)).toBe(true);
  });

  it('reuses existing widget root if present in container', () => {
    const container = document.createElement('div');
    const existing = document.createElement('cw-widget-root');
    container.appendChild(existing);

    const root = mountChatWidget(container);
    expect(root).toBe(existing);
  });

  it('mounts chat widget with token hydration and handles empty token', () => {
    const container = document.createElement('div');
    const token = {
      clientName: 'Hydrated Client',
      features: { voiceCallEnabled: true },
    };

    const root = mountChatWidgetWithToken(token, container);
    expect(root).toBeDefined();
    expect(container.contains(root)).toBe(true);

    const root2 = mountChatWidgetWithToken(null as any, container);
    expect(root2).toBeDefined();
  });

  it('handles DOMContentLoaded listener when document is loading on module import', async () => {
    Object.defineProperty(document, 'readyState', {
      value: 'loading',
      configurable: true,
      writable: true,
    });

    const origDefine = customElements.define.bind(customElements);
    const defineSpy = vi.spyOn(customElements, 'define').mockImplementation((name, constructor, options) => {
      if (!customElements.get(name)) {
        origDefine(name, constructor, options);
      }
    });

    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    vi.resetModules();
    await import('../index.js');

    expect(addEventListenerSpy).toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));

    // Fire the DOMContentLoaded event to execute mount()
    const event = new Event('DOMContentLoaded');
    document.dispatchEvent(event);

    Object.defineProperty(document, 'readyState', {
      value: 'complete',
      configurable: true,
      writable: true,
    });
    defineSpy.mockRestore();
  });

  it('handles environment where window is undefined', async () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error mocking window undefined
    delete globalThis.window;

    const origDefine = customElements?.define?.bind(customElements);
    let defineSpy: any;
    if (customElements) {
      defineSpy = vi.spyOn(customElements, 'define').mockImplementation((name, constructor, options) => {
        if (!customElements.get(name)) {
          origDefine(name, constructor, options);
        }
      });
    }

    vi.resetModules();
    await import('../index.js');
    globalThis.window = originalWindow;
    if (defineSpy) defineSpy.mockRestore();
  });
});
