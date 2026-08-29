import { describe, it, expect, beforeEach } from 'vitest';
import '../../../components/templates/cw-widget-layout.js';
import { CwWidgetLayout } from '../../../components/templates/cw-widget-layout.js';

describe('CwWidgetLayout Template Component', () => {
  let element: CwWidgetLayout;

  beforeEach(async () => {
    document.body.innerHTML = '';
    element = new CwWidgetLayout();
    document.body.appendChild(element);
    await element.updateComplete;
  });

  it('should instantiate and mount cw-widget-layout element', () => {
    expect(element).toBeDefined();
    expect(element.tagName.toLowerCase()).toBe('cw-widget-layout');
  });

  it('should render default bubble, greet window, and chat panel slots', async () => {
    element.activeTrigger = 'bubble';
    element.bubbleConfig = { enabled: true, hideOnOpen: true };
    await element.updateComplete;

    const bubbleSlot = element.shadowRoot?.querySelector('slot[name="trigger"]');
    expect(bubbleSlot).not.toBeNull();

    const greetSlot = element.shadowRoot?.querySelector('slot[name="greet"]');
    expect(greetSlot).not.toBeNull();

    const panelSlot = element.shadowRoot?.querySelector('slot[name="panel"]');
    expect(panelSlot).not.toBeNull();
  });

  it('handles chatcard activeTrigger and hideOnOpen false stacking math', async () => {
    element.activeTrigger = 'chatcard';
    element.chatbarConfig = { enabled: true, cardOffsetRight: 20, hideOnOpen: false, stackGap: 10 };
    element.chatWindowConfig = { offsetBottom: 10, offsetRight: 10 };
    await element.updateComplete;

    const chatbar = element.shadowRoot?.querySelector('cw-chatbar');
    expect(chatbar).not.toBeNull();

    element.activeTrigger = 'bubble';
    element.bubbleConfig = { hideOnOpen: false, stackGap: 10 };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('cw-bubble')).not.toBeNull();
  });

  it('handles chatbar trigger with barOffsetBottom, barOffsetRight, cbs.height, and cbs.hideOnOpen', async () => {
    element.activeTrigger = 'chatbar';
    element.chatbarConfig = {
      enabled: true,
      barOffsetBottom: 15,
      barOffsetRight: 25,
      height: 50,
      hideOnOpen: false,
      stackGap: 8,
    };
    element.chatWindowConfig = { offsetBottom: 15, offsetRight: 25 };
    element.greetWindowConfig = { spacing: 20 };
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('cw-chatbar')).not.toBeNull();
  });

  it('handles chatcard trigger with card layout fallbacks and undefined offset properties', async () => {
    element.activeTrigger = 'chatcard';
    element.chatbarConfig = {
      enabled: true,
      layout: 'card',
      offsetBottom: 18,
      offsetRight: 22,
      hideOnOpen: true,
    };
    element.chatWindowConfig = { offsetBottom: 'invalid' as any };
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('cw-chatbar')).not.toBeNull();
  });

  it('handles bubble trigger with custom height, offsetBottom, offsetRight, and stackGap', async () => {
    element.activeTrigger = 'bubble';
    element.bubbleConfig = {
      enabled: true,
      offsetBottom: 20,
      offsetRight: 30,
      height: 70,
      hideOnOpen: false,
      stackGap: 15,
    };
    element.chatWindowConfig = { offsetBottom: null as any, offsetRight: null as any };
    element.greetWindowConfig = {};
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('cw-bubble')).not.toBeNull();
  });

  it('handles chatcard and chatbar triggers with offsetRight fallback', async () => {
    element.activeTrigger = 'chatcard';
    element.chatbarConfig = { enabled: true, cardOffsetRight: 25, offsetRight: null as any };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('cw-chatbar')).not.toBeNull();

    element.activeTrigger = 'chatbar';
    element.chatbarConfig = { enabled: true, barOffsetRight: 25, offsetRight: null as any };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('cw-chatbar')).not.toBeNull();

    element.activeTrigger = 'bubble';
    element.bubbleConfig = { enabled: true, offsetBottom: 0, offsetRight: 0 };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('cw-bubble')).not.toBeNull();
  });

  it('falls back to default 16px offsets when chatcard/chatbar offsets are undefined', async () => {
    element.activeTrigger = 'chatcard';
    element.chatbarConfig = { enabled: true, layout: 'card' };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('cw-chatbar')).not.toBeNull();

    // chatbar trigger with no barOffsetRight but an offsetRight → falls back to it
    element.activeTrigger = 'chatbar';
    element.chatbarConfig = { enabled: true, offsetRight: 30 };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('cw-chatbar')).not.toBeNull();

    // chatbar trigger with neither barOffsetRight nor offsetRight → 16 default
    element.activeTrigger = 'chatbar';
    element.chatbarConfig = { enabled: true };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('cw-chatbar')).not.toBeNull();
  });
});
