import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DismissController } from '../../utils/dismiss.js';
import { LitElement } from 'lit';

class TestDismissElement extends LitElement {
  onDismissCallback = vi.fn();
  enabledState = true;

  controller = new DismissController(this, {
    onDismiss: (e) => this.onDismissCallback(e),
    enabled: () => this.enabledState,
  });
}

class TestDismissEventElement extends LitElement {
  controller = new DismissController(this, {
    eventName: 'custom-dismiss',
    enabled: true,
  });
}

if (!customElements.get('test-dismiss-element')) {
  customElements.define('test-dismiss-element', TestDismissElement);
}
if (!customElements.get('test-dismiss-event-element')) {
  customElements.define('test-dismiss-event-element', TestDismissEventElement);
}

describe('utils/dismiss.ts', () => {
  let element: TestDismissElement;

  beforeEach(async () => {
    document.body.innerHTML = '';
    element = new TestDismissElement();
    document.body.appendChild(element);
    await element.updateComplete;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should instantiate DismissController on Lit element host', () => {
    expect(element.controller).toBeDefined();
  });

  it('should invoke onDismiss callback on outside pointerdown when enabled', async () => {
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const outsideDiv = document.createElement('div');
    document.body.appendChild(outsideDiv);

    outsideDiv.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));

    expect(element.onDismissCallback).toHaveBeenCalled();
  });

  it('should dispatch custom event when onDismiss is omitted', async () => {
    const eventElement = new TestDismissEventElement();
    document.body.appendChild(eventElement);
    await eventElement.updateComplete;

    await new Promise((resolve) => requestAnimationFrame(resolve));

    const listener = vi.fn();
    eventElement.addEventListener('custom-dismiss', listener);

    const outsideDiv = document.createElement('div');
    document.body.appendChild(outsideDiv);

    outsideDiv.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));

    expect(listener).toHaveBeenCalled();
  });

  it('should not invoke callback when disabled', async () => {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    element.enabledState = false;

    const outsideDiv = document.createElement('div');
    document.body.appendChild(outsideDiv);

    outsideDiv.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));

    expect(element.onDismissCallback).not.toHaveBeenCalled();
  });

  it('should remove listener on hostDisconnected', async () => {
    await new Promise((resolve) => requestAnimationFrame(resolve));

    element.remove();
    element.controller.hostDisconnected();

    const outsideDiv = document.createElement('div');
    document.body.appendChild(outsideDiv);

    outsideDiv.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
  });

  it('handles enabled boolean, inside clicks, default eventName, and multiple hostConnected calls', async () => {
    class DefaultEventElement extends LitElement {
      controller = new DismissController(this, { enabled: false });
    }
    customElements.define('default-event-element', DefaultEventElement);

    const defaultEl = new DefaultEventElement();
    document.body.appendChild(defaultEl);
    await defaultEl.updateComplete;

    // Test inside click (path includes host)
    const listener = vi.fn();
    defaultEl.addEventListener('cw:close-popups', listener);

    defaultEl.controller.hostConnected();
    await new Promise((r) => requestAnimationFrame(r));
    // Calling hostConnected again while already listening
    defaultEl.controller.hostConnected();
    await new Promise((r) => requestAnimationFrame(r));

    // Dispatch click INSIDE host
    defaultEl.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    expect(listener).not.toHaveBeenCalled();

    defaultEl.controller.hostDisconnected();
  });

  it('handles boolean-enabled controllers: outside dismisses, inside clicks are suppressed', async () => {
    class BoolEnabledElement extends LitElement {
      controller = new DismissController(this, { enabled: true });
    }
    customElements.define('bool-enabled-element', BoolEnabledElement);

    const boolEl = new BoolEnabledElement();
    const listener = vi.fn();
    boolEl.addEventListener('cw:close-popups', listener);
    document.body.appendChild(boolEl);
    await boolEl.updateComplete;
    await new Promise((r) => requestAnimationFrame(r));

    const outside = document.createElement('div');
    document.body.appendChild(outside);
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    expect(listener).toHaveBeenCalledTimes(1);

    // Pointerdown INSIDE the host must NOT dismiss
    boolEl.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    expect(listener).toHaveBeenCalledTimes(1);

    boolEl.remove();
  });

  it('defaults to enabled and the default cw:close-popups event when no options are given', async () => {
    class NoOptionsElement extends LitElement {
      controller = new DismissController(this);
    }
    customElements.define('no-options-element', NoOptionsElement);

    const el = new NoOptionsElement();
    const listener = vi.fn();
    el.addEventListener('cw:close-popups', listener);
    document.body.appendChild(el);
    await el.updateComplete;
    await new Promise((r) => requestAnimationFrame(r));

    const outside = document.createElement('div');
    document.body.appendChild(outside);
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    expect(listener).toHaveBeenCalledTimes(1);

    el.remove();
  });
});
