import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CwWidgetRoot } from '../components/pages/cw-widget-root.js';

describe('CwWidgetRoot Component Tests', () => {
  let element: CwWidgetRoot;

  beforeEach(async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Mock fetch: no network in tests'));
    document.body.innerHTML = '';
    element = new CwWidgetRoot();
    document.body.appendChild(element);
    await element.updateComplete;
  });

  it('should instantiate and mount cw-widget-root into the DOM', () => {
    expect(element).toBeDefined();
    expect(element.tagName.toLowerCase()).toBe('cw-widget-root');
  });

  it('should accept property attributes', async () => {
    element.clientName = 'Acme Corp Support';
    element.accentColor = '#8b5cf6';
    element.greetOpeningDelaySec = 3.0;

    await element.updateComplete;

    expect(element.clientName).toBe('Acme Corp Support');
    expect(element.accentColor).toBe('#8b5cf6');
    expect(element.greetOpeningDelaySec).toBe(3.0);
  });

  it('should provide getDebugInfo() diagnostic data', async () => {
    element.accentColor = '#0b5fff';
    element.triggerType = 'bubble';
    await element.updateComplete;

    expect(typeof element.getDebugInfo).toBe('function');
    const debug = element.getDebugInfo();

    expect(debug).toBeDefined();
    expect(debug.activeTrigger).toBe('bubble');
    expect(debug.effectiveConfigs).toBeDefined();
    expect(debug.cssVariables).toBeDefined();
    expect(debug.host).toBeDefined();
  });
});
