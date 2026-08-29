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
