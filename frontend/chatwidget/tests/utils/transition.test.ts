import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnterLeaveController } from '../../utils/transition.js';
import { LitElement } from 'lit';

class TestTransitionElement extends LitElement {
  controller = new EnterLeaveController(this, {
    enterMs: () => 100,
    leaveMs: () => 100,
  });
  defaultController = new EnterLeaveController(this);
}
customElements.define('test-transition-element', TestTransitionElement);

describe('utils/transition.ts', () => {
  let element: TestTransitionElement;

  beforeEach(async () => {
    document.body.innerHTML = '';
    element = new TestTransitionElement();
    document.body.appendChild(element);
    await element.updateComplete;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should initialize phase to none and render to false', () => {
    expect(element.controller.phase).toBe('none');
    expect(element.controller.render).toBe(false);
    expect(element.defaultController.enterMs()).toBe(300);
    expect(element.defaultController.leaveMs()).toBe(200);
  });

  it('should return immediately when setTarget called with same value', () => {
    element.controller.setTarget(false);
    expect(element.controller.phase).toBe('none');
  });

  it('should transition to enter and then open when target set to true', async () => {
    element.controller.setTarget(true);
    expect(element.controller.phase).toBe('enter');
    expect(element.controller.render).toBe(true);

    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    expect(element.controller.phase).toBe('open');
  });

  it('should transition to leave and then none when target set to false', async () => {
    element.controller.setTarget(true);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    element.controller.setTarget(false);
    expect(element.controller.phase).toBe('leave');
    expect(element.controller.render).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(element.controller.phase).toBe('none');
    expect(element.controller.render).toBe(false);
  });

  it('handles rapid toggle canceling active raf/timeout and hostDisconnected', async () => {
    element.controller.setTarget(true);
    element.controller.setTarget(false);
    element.controller.setTarget(true);

    element.controller.hostConnected();
    element.controller.hostDisconnected();

    // Call hostDisconnected while leave timeout is active
    element.controller.setTarget(false);
    element.controller.hostDisconnected();
  });
});
