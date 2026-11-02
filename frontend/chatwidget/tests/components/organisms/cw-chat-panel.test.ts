import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import '../../../components/organisms/cw-chat-panel.js';
import { CwChatPanel } from '../../../components/organisms/cw-chat-panel.js';

describe('CwChatPanel Organism Component', () => {
  let element: CwChatPanel;

  beforeEach(async () => {
    document.body.innerHTML = '';
    element = new CwChatPanel();
    element.chatState = {
      state: 'active',
      messages: [],
      draft: '',
      panelOpen: true,
      unreadCount: 0,
      isExpanded: false,
      isMobile: false,
      clientName: 'Support Panel',
      agentName: 'Sarah',
      agentsOnline: true,
      token: '123',
      position: 1,
      menuOpen: false,
      attachOpen: false,
      emojiOpen: false,
      confirmBox: null,
      reconnecting: false,
      soundsOn: true,
      flags: {},
    };
    element.chatWindowConfig = {
      accentColor: '#0b5fff',
      widgetWidth: 380,
      widgetHeight: 600,
      animationOpeningSec: 0.01,
      animationClosingSec: 0.01,
    };
    document.body.appendChild(element);
    await element.updateComplete;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should instantiate and mount cw-chat-panel element', () => {
    expect(element).toBeDefined();
    expect(element.tagName.toLowerCase()).toBe('cw-chat-panel');
  });

  it('should render header and body when panelOpen is true', async () => {
    vi.useFakeTimers();
    element.panelOpen = true;
    await element.updateComplete;
    vi.advanceTimersByTime(100);

    const header = element.shadowRoot?.querySelector('cw-chat-header');
    expect(header).not.toBeNull();

    const body = element.shadowRoot?.querySelector('cw-chat-body');
    expect(body).not.toBeNull();
  });

  it('renders confirm dialog overlay and reconnecting banner', async () => {
    element.panelOpen = true;
    element.chatState = {
      ...element.chatState!,
      reconnecting: true,
      confirmBox: { message: 'End chat?' },
    };
    await element.updateComplete;

    const confirmDialog = element.shadowRoot?.querySelector('cw-confirm-dialog');
    expect(confirmDialog).not.toBeNull();

    const reconnecting = element.shadowRoot?.querySelector('.reconnecting');
    expect(reconnecting).not.toBeNull();
  });

  it('handles focusOnOpen setTimeout and emit method', async () => {
    expect((element as any).transition.enterMs()).toBeGreaterThan(0);
    expect((element as any).transition.leaveMs()).toBeGreaterThan(0);

    vi.useFakeTimers();
    element.panelOpen = false;
    await element.updateComplete;

    const spy = vi.fn();
    element.addEventListener('cw:test-event', spy);
    (element as any).emit('cw:test-event');
    expect(spy).toHaveBeenCalled();

    (element as any).focusOnOpen();
    vi.advanceTimersByTime(100);

    // Test transition enterMs and leaveMs fallback when animationOpeningSec is undefined
    element.chatWindowConfig = {};
    element.panelOpen = false;
    await element.updateComplete;

    expect((element as any).transition.enterMs()).toBe(300);
    expect((element as any).transition.leaveMs()).toBe(200);

    element.panelOpen = true;
    await element.updateComplete;
    vi.advanceTimersByTime(500);
  });

  it('handles fixed = false, expanded layout, widgetShadow, widgetBorder, custom confirmBox properties, and state != active focusOnOpen', async () => {
    element.fixed = false;
    element.bottomPx = 20;
    element.rightPx = 20;
    element.maxHeightPx = '500px';
    element.panelOpen = true;
    element.chatState = {
      ...element.chatState!,
      state: 'welcome',
      isExpanded: true,
      confirmBox: {
        message: 'Are you sure?',
        cancelLabel: 'No',
        confirmLabel: 'Yes',
      },
    };
    element.chatWindowConfig = {
      widgetWidth: 380,
      expandedWidth: 500,
      widgetHeight: 600,
      widgetShadow: true,
      widgetShadowBlur: 20,
      widgetShadowColor: 'rgba(0,0,0,0.5)',
      widgetBorderEnabled: true,
      widgetBorderWidth: 2,
      widgetBorderColor: '#ff0000',
      widgetBorderRadius: 16,
      bodyBg: '#ffffff',
      accentColor: '#00ffff',
      modalCardBg: '#f0f0f0',
      modalMessageColor: '#111111',
      modalBorderRadius: 8,
      endChatCancelBg: '#e0e0e0',
      endChatCancelTextColor: '#333333',
      endChatCancelBorderColor: '#cccccc',
      endChatConfirmBg: '#ff0000',
      endChatConfirmTextColor: '#ffffff',
    };
    await element.updateComplete;

    const wrapper = element.shadowRoot?.querySelector('.panel-wrapper') as HTMLElement;
    expect(wrapper.style.position).toBe('absolute');

    const dialog = element.shadowRoot?.querySelector('cw-confirm-dialog');
    expect(dialog).not.toBeNull();

    // Trigger focusOnOpen when state != 'active'
    (element as any).focusOnOpen();

    // Default fallbacks for expandedWidth, widgetShadowBlur/Color, and widgetBorderWidth/Color
    element.chatWindowConfig = {
      widgetShadow: true,
      widgetBorderEnabled: true,
      animationClosingSec: 0.1,
      animationOpeningSec: 0.1,
    };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.panel')).not.toBeNull();

    // Leave phase (isLeaving = true & panelOpen = false aria-modal)
    element.panelOpen = false;
    await element.updateComplete;
    const panel = element.shadowRoot?.querySelector('.panel');
    if (panel) {
      expect(panel.getAttribute('aria-modal')).toBe('false');
    }
  });
});

describe('CwChatPanel animation timing and confirm dialog', () => {
  const state = {
    state: 'active',
    messages: [],
    panelOpen: true,
    unreadCount: 0,
    isExpanded: false,
    isMobile: false,
    clientName: 'Acme',
    agentName: 'Sarah',
    agentsOnline: true,
    token: 't',
    position: 1,
    menuOpen: false,
    attachOpen: false,
    emojiOpen: false,
    confirmBox: null,
    reconnecting: false,
    soundsOn: true,
    flags: {}
  };
  const mount = async (config: object, over: object = {}, phase?: 'enter' | 'open' | 'leave') => {
    document.body.innerHTML = '';
    const el = new CwChatPanel();
    el.chatWindowConfig = config as never;
    el.chatState = { ...state, ...over } as never;
    el.panelOpen = true;
    document.body.appendChild(el);
    await el.updateComplete;
    if (phase) {
      // Skip the animation frames: put the transition controller straight into the phase under test.
      (el as any).transition._phase = phase;
      el.requestUpdate();
      await el.updateComplete;
    }
    return el;
  };
  const wrapperStyle = (el: CwChatPanel) => el.shadowRoot!.querySelector('.panel-wrapper')!.getAttribute('style')!;

  it('opens in 0.3s and closes in 0.2s unless configured, and treats 0 as a real duration', async () => {
    const defaults: any = await mount({});
    expect([defaults.transition.enterMs(), defaults.transition.leaveMs()]).toEqual([300, 200]);
    const custom: any = await mount({ animationOpeningSec: 0.5, animationClosingSec: 1 });
    expect([custom.transition.enterMs(), custom.transition.leaveMs()]).toEqual([500, 1000]);
    const instant: any = await mount({ animationOpeningSec: 0, animationClosingSec: 0 });
    expect([instant.transition.enterMs(), instant.transition.leaveMs()]).toEqual([0, 0]);
  });

  it('uses the opening duration while entering or open and the closing one while leaving', async () => {
    const config = { animationOpeningSec: 0.6, animationClosingSec: 0.1 };
    expect(wrapperStyle(await mount(config, {}, 'enter'))).toContain('opacity 0.6s ease, transform 0.6s ease');
    expect(wrapperStyle(await mount(config, {}, 'open'))).toContain('opacity 0.6s ease, transform 0.6s ease');
    expect(wrapperStyle(await mount(config, {}, 'leave'))).toContain('opacity 0.1s ease, transform 0.1s ease');
    expect(wrapperStyle(await mount({}, {}, 'open'))).toContain('opacity 0.3s ease');
    expect(wrapperStyle(await mount({}, {}, 'leave'))).toContain('opacity 0.2s ease');
    expect(wrapperStyle(await mount({ animationOpeningSec: 0 }, {}, 'open'))).toContain('opacity 0s ease');
    expect(wrapperStyle(await mount({ animationClosingSec: 0 }, {}, 'leave'))).toContain('opacity 0s ease');
  });

  it('hides the panel while entering or leaving and shows it when open', async () => {
    expect(wrapperStyle(await mount({}, {}, 'enter'))).toContain('opacity: 0');
    expect(wrapperStyle(await mount({}, {}, 'leave'))).toContain('scale(0.5) translateY(32px)');
    expect(wrapperStyle(await mount({}, {}, 'open'))).toContain('opacity: 1');
    expect(wrapperStyle(await mount({}, {}, 'open'))).toContain('scale(1) translateY(0)');
  });

  it('sizes the panel normally and expanded, with the default position', async () => {
    expect(wrapperStyle(await mount({}, {}, 'open'))).toContain('width: 350px; height: 550px');
    expect(wrapperStyle(await mount({}, { isExpanded: true }, 'open'))).toContain('width: 480px');
    expect(wrapperStyle(await mount({ widgetWidth: 300, expandedWidth: 600, widgetHeight: 400 }, { isExpanded: true }, 'open'))).toContain('width: 600px; height: 400px');
    expect(wrapperStyle(await mount({}, {}, 'open'))).toContain('bottom: 12px; right: 16px');
  });

  it('shows the confirm dialog with its labels and a modal radius that may be zero', async () => {
    const confirmBox = { message: 'End this chat?', confirmLabel: 'End', cancelLabel: 'Stay' };
    const withRadius: any = (await mount({ modalBorderRadius: 0 }, { confirmBox })).shadowRoot!.querySelector('cw-confirm-dialog');
    expect([withRadius.message, withRadius.confirmLabel, withRadius.cancelLabel, withRadius.modalBorderRadius]).toEqual(['End this chat?', 'End', 'Stay', 0]);
    const defaults: any = (await mount({}, { confirmBox: { message: 'Sure?' } })).shadowRoot!.querySelector('cw-confirm-dialog');
    expect([defaults.confirmLabel, defaults.cancelLabel, defaults.modalBorderRadius, defaults.modalCardBg]).toEqual(['Confirm', 'Cancel', 16, '#ffffff']);
    expect((await mount({ modalBorderRadius: 24 }, { confirmBox })).shadowRoot!.querySelector<any>('cw-confirm-dialog').modalBorderRadius).toBe(24);
    expect((await mount({})).shadowRoot!.querySelector('cw-confirm-dialog')).toBeNull();
  });

  it('shows the reconnecting banner only while reconnecting', async () => {
    expect((await mount({}, { reconnecting: true })).shadowRoot!.querySelector('.reconnecting')!.textContent).toContain('Reconnecting');
    expect((await mount({})).shadowRoot!.querySelector('.reconnecting')).toBeNull();
  });
});
