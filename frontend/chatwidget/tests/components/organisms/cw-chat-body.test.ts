import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../../../components/organisms/cw-chat-body.js';
import { CwChatBody } from '../../../components/organisms/cw-chat-body.js';

describe('CwChatBody Organism Component', () => {
  let element: CwChatBody;

  beforeEach(async () => {
    document.body.innerHTML = '';
    element = new CwChatBody();
    element.chatState = {
      state: 'active',
      messages: [],
      draft: '',
      panelOpen: true,
      unreadCount: 0,
      isExpanded: false,
      isMobile: false,
      clientName: 'Test Support',
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
      consentDismissed: false,
      flags: {},
    };
    element.chatWindowConfig = {
      accentColor: '#0b5fff',
      bodyBg: '#ffffff',
      modernUi: true,
    };
    document.body.appendChild(element);
    await element.updateComplete;
  });

  it('should instantiate and mount cw-chat-body element', () => {
    expect(element).toBeDefined();
    expect(element.tagName.toLowerCase()).toBe('cw-chat-body');
  });

  it('should render message list and composer in active state', async () => {
    element.chatState = {
      ...element.chatState,
      state: 'active',
      messages: [
        { key: '1', senderType: 'VISITOR', body: 'Hello', created: new Date().toISOString() },
      ],
    };
    await element.updateComplete;

    const bubble = element.shadowRoot?.querySelector('cw-message-bubble');
    expect(bubble).not.toBeNull();

    const composer = element.shadowRoot?.querySelector('cw-composer');
    expect(composer).not.toBeNull();
  });

  it('renders welcome, prechat, offline, postchat, offline-sent, queued, closed states', async () => {
    const prechatSpy = vi.fn();
    const offlineSpy = vi.fn();
    const postchatSpy = vi.fn();
    const startNewSpy = vi.fn();

    element.addEventListener('cw:submit-prechat', prechatSpy);
    element.addEventListener('cw:submit-offline', offlineSpy);
    element.addEventListener('cw:submit-postchat', postchatSpy);
    element.addEventListener('cw:start-new', startNewSpy);

    // Welcome state
    element.chatState = { ...element.chatState, state: 'welcome' };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('cw-welcome-card')).not.toBeNull();

    // Prechat state
    element.chatState = { ...element.chatState, state: 'prechat' };
    await element.updateComplete;
    const prechatForm = element.shadowRoot?.querySelector('cw-chat-form');
    expect(prechatForm).not.toBeNull();
    prechatForm?.dispatchEvent(new CustomEvent('cw:form-submit', { detail: { values: { name: 'A' } } }));
    expect(prechatSpy).toHaveBeenCalled();

    // Offline state
    element.chatState = { ...element.chatState, state: 'offline' };
    await element.updateComplete;
    const offlineForm = element.shadowRoot?.querySelector('cw-chat-form');
    expect(offlineForm).not.toBeNull();
    offlineForm?.dispatchEvent(new CustomEvent('cw:form-submit', { detail: { values: { name: 'A' } } }));
    expect(offlineSpy).toHaveBeenCalled();

    // Postchat state
    element.chatState = { ...element.chatState, state: 'postchat' };
    await element.updateComplete;
    const postchatForm = element.shadowRoot?.querySelector('cw-chat-form');
    expect(postchatForm).not.toBeNull();
    postchatForm?.dispatchEvent(new CustomEvent('cw:form-submit', { detail: { values: { rating: '5' } } }));
    expect(postchatSpy).toHaveBeenCalled();

    // Offline-sent state
    element.chatState = { ...element.chatState, state: 'offline-sent' };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.offline-done')).not.toBeNull();

    // Queued state
    element.chatState = { ...element.chatState, state: 'queued' };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.ticket-number')).not.toBeNull();

    // Closed state
    element.chatState = { ...element.chatState, state: 'closed' };
    await element.updateComplete;
    const closedBtn = element.shadowRoot?.querySelector('.closed-note button') as HTMLElement;
    closedBtn?.click();
    expect(startNewSpy).toHaveBeenCalled();
  });

  it('handles image cropper events and file selection', async () => {
    const cropSpy = vi.fn();
    // The component now emits cw:send-cropped-image (not cw:send) with the
    // full base64 data URL so the store can add a real image attachment.
    element.addEventListener('cw:send-cropped-image', cropSpy);

    const cropper = element.shadowRoot?.querySelector('cw-image-cropper');
    expect(cropper).not.toBeNull();

    const dataUrl = 'data:image/png;base64,123';
    cropper?.dispatchEvent(
      new CustomEvent('cw:image-cropped', { detail: { dataUrl }, bubbles: true, composed: true })
    );
    expect(cropSpy).toHaveBeenCalled();
    // Verify the full data URL is passed — NOT a truncated placeholder string
    expect(cropSpy.mock.calls[0][0].detail).toBe(dataUrl);

    cropper?.dispatchEvent(new CustomEvent('cw:close'));

    // Test file input selection (Document PDF)
    const fileInput = element.shadowRoot?.querySelector('#cw-file-input') as HTMLInputElement;
    if (fileInput) {
      const docFile = new File([''], 'doc.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [docFile],
        writable: true,
        configurable: true,
      });
      const attachSpy = vi.fn();
      element.addEventListener('cw:attach-files', attachSpy);
      fileInput.dispatchEvent(new Event('change'));
      expect(attachSpy).toHaveBeenCalled();
    }

    // Test file input selection (Image PNG with FileReader onload)
    if (fileInput) {
      class MockFileReader {
        onload: ((e: any) => void) | null = null;
        readAsDataURL() {
          if (this.onload) {
            this.onload({ target: { result: 'data:image/png;base64,abc' } });
          }
        }
      }
      vi.stubGlobal('FileReader', MockFileReader as any);

      const imgFile = new File(['img'], 'photo.png', { type: 'image/png' });
      Object.defineProperty(fileInput, 'files', {
        value: [imgFile],
        writable: true,
        configurable: true,
      });
      fileInput.dispatchEvent(new Event('change'));
      vi.unstubAllGlobals();
    }

    // Test attach menu file selector trigger
    element.chatState = { ...element.chatState, attachOpen: true };
    await element.updateComplete;
    const attachMenu = element.shadowRoot?.querySelector('cw-attach-menu');
    expect(attachMenu).not.toBeNull();
    attachMenu?.dispatchEvent(new CustomEvent('cw:trigger-file-select'));

    // Test focusInput and consent dismiss
    element.focusInput();
    const consentX = element.shadowRoot?.querySelector('.consent-x') as HTMLElement;
    const consentSpy = vi.fn();
    element.addEventListener('cw:dismiss-consent', consentSpy);
    consentX?.click();
    expect(consentSpy).toHaveBeenCalled();
  });

  it('handles boot state, typing indicator, menuOpen, emojiOpen, offlineName, empty props, and rev scroll update', async () => {
    // 1. empty props
    element.chatState = undefined as any;
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.panel-body')).toBeNull();

    // 2. boot state
    element.chatState = {
      state: 'boot',
      messages: [],
      draft: '',
      panelOpen: true,
      unreadCount: 0,
      isExpanded: false,
      isMobile: false,
      clientName: 'Support',
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
      consentDismissed: false,
      flags: { 'widget.modernUi': true, 'attachments.enabled': true },
    };
    element.chatWindowConfig = { bodyBg: '#ffffff' };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.center-note')).not.toBeNull();

    // 3. typing indicator, menuOpen, emojiOpen, groupStart/groupEnd with multiple messages
    element.chatState = {
      ...element.chatState,
      state: 'active',
      messages: [
        { key: '1', senderType: 'VISITOR', body: 'Hello', created: new Date().toISOString() },
        { key: '2', senderType: 'VISITOR', body: 'World', created: new Date().toISOString() },
        { key: '3', senderType: 'AGENT', body: 'Hi!', created: new Date().toISOString() },
      ],
      typingName: 'Sarah',
      menuOpen: true,
      emojiOpen: true,
      consentDismissed: true,
    };
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('.typing-bubble')).not.toBeNull();
    expect(element.shadowRoot?.querySelector('cw-chat-menu')).not.toBeNull();
    expect(element.shadowRoot?.querySelector('cw-emoji-picker')).not.toBeNull();

    // 4. rev update triggers scrollToBottom
    vi.useFakeTimers();
    element.rev = 1;
    await element.updateComplete;
    vi.advanceTimersByTime(100);
    vi.useRealTimers();

    // 5. offline-sent with offlineName and offlineEmail
    (element as any).offlineName = 'John';
    (element as any).offlineEmail = 'john@example.com';
    element.chatState = {
      ...element.chatState,
      state: 'offline-sent',
    };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.offline-done')?.textContent).toContain('John');

    // 6. Welcome bgGradient, bodyBg undefined, footerBg fallback from bodyBg
    element.chatWindowConfig = {
      welcome: { enabled: true, bgGradient: '#000000' },
      bodyBg: '#222222',
      footerBg: undefined,
    };
    element.chatState = {
      ...element.chatState,
      state: 'welcome',
      messages: undefined as any,
    };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('cw-welcome-card')).not.toBeNull();

    // 7. Active state with bodyBg and footerBg undefined
    element.chatWindowConfig = {
      bodyBg: undefined,
      footerBg: undefined,
    };
    element.chatState = {
      ...element.chatState,
      state: 'active',
      messages: [],
      flags: undefined as any,
    };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.messages-area')).not.toBeNull();

    // 8. rev update when chatState is undefined or messages is undefined when lastCount > 0
    (element as any).chatState = undefined;
    element.rev = 2;
    await element.updateComplete;

    element.chatState = {
      state: 'active',
      messages: [{ key: 'm1', senderType: 'VISITOR', body: 'Hi', created: '' }],
    } as any;
    element.rev = 3;
    await element.updateComplete;

    element.chatState = {
      state: 'active',
      messages: [], // length = 0 (falsy number)
    } as any;
    element.rev = 4;
    await element.updateComplete;

    element.chatState = {
      state: 'prechat',
      messages: undefined, // length = undefined (falsy undefined)
    } as any;
    element.rev = 5;
    await element.updateComplete;

    // openFileSelector when #cw-file-input is not in DOM
    (element as any).openFileSelector();

    element.rev = 5; // same rev & same count
    await element.updateComplete;
  });
});

describe('CwChatBody screens per chat state', () => {
  const baseState = {
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
    position: 3,
    menuOpen: false,
    attachOpen: false,
    emojiOpen: false,
    confirmBox: null,
    reconnecting: false,
    soundsOn: true,
    flags: {}
  };
  const mount = async (state: object, config: object = {}, extra: Partial<CwChatBody> = {}) => {
    document.body.innerHTML = '';
    const el = new CwChatBody();
    el.chatState = { ...baseState, ...state } as never;
    el.chatWindowConfig = config as never;
    Object.assign(el, extra);
    document.body.appendChild(el);
    await el.updateComplete;
    return el;
  };
  const q = (el: CwChatBody, sel: string) => el.shadowRoot!.querySelector(sel);
  const body = (el: CwChatBody) => q(el, '.panel-body') as HTMLElement;

  it('renders nothing without a chat state or window config', async () => {
    const el = new CwChatBody();
    document.body.appendChild(el);
    await el.updateComplete;
    expect(q(el, '.panel-body')).toBeNull();
  });

  it('shows the welcome card on a full-bleed gradient body', async () => {
    const el = await mount({ state: 'welcome' }, { welcome: { bgGradient: 'linear-gradient(red, blue)' }, accentColor: '#123' });
    expect(q(el, 'cw-welcome-card')).not.toBeNull();
    expect((q(el, 'cw-welcome-card') as any).accentColor).toBe('#123');
    expect(body(el).getAttribute('style')).toContain('background: linear-gradient(red, blue)');
    expect(body(el).getAttribute('style')).toContain('padding: 0px');
    expect(body(el).getAttribute('style')).toContain('overflow: hidden');
    expect(q(el, 'cw-composer')).toBeNull();

    const fallback = await mount({ state: 'welcome' });
    expect(body(fallback).getAttribute('style')).toContain('linear-gradient(135deg, var(--cw-accent, #0b5fff), #22d3ee)');
  });

  it('falls through to the live chat when the welcome screen is switched off', async () => {
    const el = await mount({ state: 'welcome' }, { welcome: { enabled: false }, bodyBg: 'beige' });
    expect(q(el, 'cw-welcome-card')).toBeNull();
    expect(q(el, '.messages-area')).not.toBeNull();
    expect(q(el, 'cw-composer')).not.toBeNull();
    expect(body(el).getAttribute('style')).toContain('background: beige');
    expect(body(el).getAttribute('style')).not.toContain('overflow: hidden');
  });

  it('shows the connecting note while booting', async () => {
    const el = await mount({ state: 'boot' });
    expect(q(el, '.center-note')!.textContent).toContain('Connecting');
    expect(q(el, 'cw-chat-form')).toBeNull();
  });

  it('shows the prechat form prefilled, and forwards its submission', async () => {
    const el = await mount({ state: 'prechat', offlineName: 'Ann', offlineEmail: 'a@b.co' });
    const form = q(el, 'cw-chat-form') as any;
    expect(form.values).toEqual({ name: 'Ann', email: 'a@b.co' });
    const seen: unknown[] = [];
    el.addEventListener('cw:submit-prechat', (e) => seen.push((e as CustomEvent).detail));
    form.dispatchEvent(new CustomEvent('cw:form-submit', { detail: { values: { name: 'Ann' } } }));
    expect(seen).toEqual([{ name: 'Ann' }]);

    const blank = await mount({ state: 'prechat' });
    expect((q(blank, 'cw-chat-form') as any).values).toEqual({ name: '', email: '' });
  });

  it('shows the offline form with its sending state, and forwards its submission', async () => {
    const el = await mount({ state: 'offline', offlineMessage: 'Call me', offlineSending: true });
    const form = q(el, 'cw-chat-form') as any;
    expect(form.values).toEqual({ name: '', email: '', message: 'Call me' });
    expect(form.submitting).toBe(true);
    const seen: unknown[] = [];
    el.addEventListener('cw:submit-offline', (e) => seen.push((e as CustomEvent).detail));
    form.dispatchEvent(new CustomEvent('cw:form-submit', { detail: { values: { message: 'x' } } }));
    expect(seen).toEqual([{ message: 'x' }]);
  });

  it('shows the post-chat form and forwards its submission', async () => {
    const el = await mount({ state: 'postchat' });
    const seen: unknown[] = [];
    el.addEventListener('cw:submit-postchat', (e) => seen.push((e as CustomEvent).detail));
    q(el, 'cw-chat-form')!.dispatchEvent(new CustomEvent('cw:form-submit', { detail: { values: { rating: 5 } } }));
    expect(seen).toEqual([{ rating: 5 }]);
  });

  it('confirms an offline message, addressing the visitor by name only when known', async () => {
    const named = await mount({ state: 'offline-sent' }, {}, { offlineName: 'Zed', offlineEmail: 'z@x.io' } as never);
    expect(q(named, '.offline-done')!.textContent).toContain('Message received');
    expect(q(named, '.offline-done p')!.textContent).toContain('Thanks, Zed!');
    expect(q(named, '.offline-done strong')!.textContent).toBe('z@x.io');
    const anonymous = await mount({ state: 'offline-sent' });
    expect(q(anonymous, '.offline-done p')!.textContent).toContain('Thanks!');
  });

  it('shows the queue position', async () => {
    const el = await mount({ state: 'queued', position: 7 });
    expect(q(el, '.ticket-number')!.textContent).toBe('7');
    expect(q(el, '.ticket-label')!.textContent).toBe('in line');
  });

  it('renders nothing for an unknown state', async () => {
    const el = await mount({ state: 'mystery' });
    expect(body(el)).not.toBeNull();
    expect(q(el, 'cw-chat-form')).toBeNull();
    expect(q(el, '.messages-area')).toBeNull();
    expect(q(el, 'cw-welcome-card')).toBeNull();
  });
});

describe('CwChatBody conversation', () => {
  const state = {
    state: 'active',
    messages: [
      { key: '1', senderType: 'VISITOR', body: 'a' },
      { key: '2', senderType: 'VISITOR', body: 'b' },
      { key: '3', senderType: 'AGENT', body: 'c' }
    ],
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
  const mount = async (over: object = {}, config: object = {}) => {
    document.body.innerHTML = '';
    const el = new CwChatBody();
    el.chatState = { ...state, ...over } as never;
    el.chatWindowConfig = config as never;
    document.body.appendChild(el);
    await el.updateComplete;
    return el;
  };
  const q = (el: CwChatBody, sel: string) => el.shadowRoot!.querySelector(sel);
  const all = (el: CwChatBody, sel: string) => Array.from(el.shadowRoot!.querySelectorAll(sel));

  it('marks the first message with a day divider and works out message groups', async () => {
    const el = await mount();
    expect(all(el, '.day-divider')).toHaveLength(1);
    const bubbles = all(el, 'cw-message-bubble') as any[];
    expect(bubbles.map((b) => [b.isGroupStart, b.isGroupEnd])).toEqual([[true, false], [false, true], [true, true]]);
    expect(bubbles[0].agentName).toBe('Sarah');
  });

  it('shows the typing indicator unless it is turned off', async () => {
    expect(q(await mount({ typingName: 'Sam' }), '.typing-bubble')!.textContent).toContain('Sam is typing');
    expect(q(await mount({ typingName: 'Sam' }, { typingIndicator: false }), '.typing-bubble')).toBeNull();
    expect(q(await mount({}), '.typing-bubble')).toBeNull();
  });

  it('shows the consent banner only while active, undismissed and in modern mode', async () => {
    expect(q(await mount(), '.consent')).not.toBeNull();
    expect(q(await mount({ consentDismissed: true }), '.consent')).toBeNull();
    expect(q(await mount({ flags: { 'widget.modernUi': false } }), '.consent')).toBeNull();
    expect(q(await mount({ state: 'closed' }), '.consent')).toBeNull();

    const el = await mount();
    const seen: string[] = [];
    el.addEventListener('cw:dismiss-consent', () => seen.push('dismissed'));
    (q(el, '.consent-x') as HTMLElement).click();
    expect(seen).toEqual(['dismissed']);
  });

  it('shows each popup only while its flag is on', async () => {
    const el = await mount({ attachOpen: true, menuOpen: true, emojiOpen: true, soundsOn: false });
    expect(q(el, 'cw-attach-menu')).not.toBeNull();
    expect((q(el, 'cw-chat-menu') as any).soundsOn).toBe(false);
    expect(q(el, 'cw-emoji-picker')).not.toBeNull();
    const none = await mount();
    expect(q(none, 'cw-attach-menu')).toBeNull();
    expect(q(none, 'cw-chat-menu')).toBeNull();
    expect(q(none, 'cw-emoji-picker')).toBeNull();
  });

  it('passes the composer and footer their settings, with modern UI and attachments off when flagged', async () => {
    const el = await mount({ draft: 'typing', uploading: true }, { inputBg: 'beige', poweredByText: 'Acme', footerBg: 'gray', bodyBg: 'white', widgetBorderRadius: 12 });
    const composer = q(el, 'cw-composer') as any;
    expect([composer.draft, composer.uploading, composer.inputBg, composer.modernUi, composer.attachmentsEnabled]).toEqual(['typing', true, 'beige', true, true]);
    const footer = q(el, 'cw-chat-footer') as any;
    expect([footer.poweredByText, footer.footerBg, footer.widgetBorderRadius, footer.modernUi]).toEqual(['Acme', 'gray', 12, true]);

    const off = await mount({ flags: { 'widget.modernUi': false, 'attachments.enabled': false } }, { bodyBg: 'white' });
    expect((q(off, 'cw-composer') as any).modernUi).toBe(false);
    expect((q(off, 'cw-composer') as any).attachmentsEnabled).toBe(false);
    expect((q(off, 'cw-chat-footer') as any).footerBg).toBe('white');
    expect((q(await mount({}, { modernUi: false }), 'cw-composer') as any).modernUi).toBe(false);
    expect((q(await mount({}, { attachmentsEnabled: false }), 'cw-composer') as any).attachmentsEnabled).toBe(false);
  });

  it('shows the transcript read-only once closed, with a way to start again', async () => {
    const el = await mount({ state: 'closed' });
    expect(q(el, '.messages-area')).not.toBeNull();
    expect(q(el, 'cw-composer')).toBeNull();
    expect(q(el, 'cw-chat-footer')).toBeNull();
    expect(q(el, '.closed-note p')!.textContent).toBe('Chat ended');
    const seen: string[] = [];
    el.addEventListener('cw:start-new', () => seen.push('new'));
    (q(el, '.closed-note button') as HTMLElement).click();
    expect(seen).toEqual(['new']);
    expect(q(await mount(), '.closed-note')).toBeNull();
  });

  it('treats a missing flag as the default and ignores an unset message list', async () => {
    const el = await mount({ messages: undefined, flags: undefined });
    expect(all(el, 'cw-message-bubble')).toHaveLength(0);
    expect(q(el, '.consent')).not.toBeNull();
  });
});
