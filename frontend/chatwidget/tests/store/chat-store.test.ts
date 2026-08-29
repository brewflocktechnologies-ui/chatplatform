import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  bubbleStore,
  greetWindowStore,
  chatWindowStore,
  featuresStore,
  chatbarStore,
  chatStore,
  subscribe,
  subscribeAll,
  initStore,
  setupGreetTimers,
  updateStoreConfig,
  exportFullStoreConfig,
  injectStoreConfig,
  whenStoreReady,
  _resetStoreForTest,
} from '../../store/chat-store.js';
import type { Message } from '../../store/chat-store.js';

describe('chat-store', () => {
  beforeEach(async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('No fetch in test'));
    window.fetch = mockFetch;
    globalThis.fetch = mockFetch;
    await initStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lazily initializes store when getStore is invoked prior to initStore', () => {
    _resetStoreForTest();
    expect(chatStore.get()).toBeDefined();
    expect(bubbleStore.get()).toBeDefined();
  });

  it('provides store accessors and initial states', () => {
    expect(bubbleStore.get()).toBeDefined();
    expect(greetWindowStore.get()).toBeDefined();
    expect(chatWindowStore.get()).toBeDefined();
    expect(featuresStore.get()).toBeDefined();
    expect(chatbarStore.get()).toBeDefined();
    expect(chatStore.get()).toBeDefined();
  });

  it('subscribes to single and all events', () => {
    const fnSingle = vi.fn();
    const fnAll = vi.fn();

    const unsubSingle = subscribe('store:chat', fnSingle);
    const unsubAll = subscribeAll(fnAll);

    chatStore.toggleExpand();

    expect(fnSingle).toHaveBeenCalled();
    expect(fnAll).toHaveBeenCalled();

    unsubSingle();
    unsubAll();
  });

  it('handles chatStore.flag', () => {
    const cs = chatStore.get();
    cs.flags = { testFlag: false };
    expect(chatStore.flag('testFlag', true)).toBe(false);
    expect(chatStore.flag('nonExistent', true)).toBe(true);
    expect(chatStore.flag('nonExistent')).toBe(true);
  });

  describe('chatStore.send', () => {
    it('handles send with draft and explicit text override', () => {
      const cs = chatStore.get();
      cs.draft = 'Draft message';
      chatStore.send();
      expect(cs.messages[cs.messages.length - 1].body).toBe('Draft message');
      expect(cs.hasSentMessage).toBe(true);

      chatStore.send('Text override');
      expect(cs.messages[cs.messages.length - 1].body).toBe('Text override');
    });

    it('ignores empty send', () => {
      const cs = chatStore.get();
      cs.draft = '   ';
      const len = cs.messages.length;
      chatStore.send();
      expect(cs.messages.length).toBe(len);
      chatStore.send('  ');
      expect(cs.messages.length).toBe(len);
    });

    it('dismisses greetWindow on send if present', () => {
      const gw = greetWindowStore.get();
      gw.visible = true;
      gw.dismissed = false;
      if (gw.inputBox) gw.inputBox.visible = true;

      chatStore.send('Hello');
      expect(gw.dismissed).toBe(true);
      expect(gw.visible).toBe(false);
      expect(gw.inputBox?.visible).toBe(false);
    });

    it('executes async status transitions (delivered, read, bot reply) with panel closed', () => {
      vi.useFakeTimers();
      const cs = chatStore.get();
      cs.panelOpen = false;
      cs.unreadCount = 0;
      cs.agentName = 'Sarah';

      chatStore.send('Async test message');
      const sentMsg = cs.messages[cs.messages.length - 1];
      expect(sentMsg.status).toBe('sent');

      // 1500ms: status delivered
      vi.advanceTimersByTime(1500);
      expect(cs.messages.find((m) => m.key === sentMsg.key)?.status).toBe('delivered');

      // 2800ms (1300ms more): status read, typingName set
      vi.advanceTimersByTime(1300);
      expect(cs.messages.find((m) => m.key === sentMsg.key)?.status).toBe('read');
      expect(cs.typingName).toBe('Sarah');

      // 4500ms (1700ms more): typingName cleared, bot reply added, unreadCount incremented
      vi.advanceTimersByTime(1700);
      expect(cs.typingName).toBe('');
      expect(cs.unreadCount).toBe(1);
      expect(cs.messages[cs.messages.length - 1].senderType).toBe('AGENT');

      vi.useRealTimers();
    });

    it('executes bot reply with panel open (unreadCount not incremented)', () => {
      vi.useFakeTimers();
      const cs = chatStore.get();
      cs.panelOpen = true;
      cs.unreadCount = 0;

      chatStore.send('Panel open test');
      vi.advanceTimersByTime(5000);

      expect(cs.unreadCount).toBe(0);
      vi.useRealTimers();
    });
  });

  describe('resetChatbarLayout', () => {
    it('resets card layout to bar layout with fallbacks when offsets are null/undefined', () => {
      const cbs = chatbarStore.get();
      cbs.enabled = true;
      cbs.layout = 'card';
      cbs.barOffsetRight = undefined as any;
      cbs.barOffsetBottom = null as any;

      chatStore.resetChatbarLayout();
      expect(cbs.layout).toBe('bar');
      expect(cbs.offsetRight).toBe(16);
      expect(cbs.offsetBottom).toBe(12);
    });

    it('resets card layout using custom bar offsets when set', () => {
      const cbs = chatbarStore.get();
      cbs.enabled = true;
      cbs.layout = 'card';
      cbs.barOffsetRight = 24;
      cbs.barOffsetBottom = 20;

      chatStore.resetChatbarLayout();
      expect(cbs.layout).toBe('bar');
      expect(cbs.offsetRight).toBe(24);
      expect(cbs.offsetBottom).toBe(20);
    });
  });

  describe('askEndChat, cancelEndChat, confirmEnd', () => {
    it('uses fallback labels when chatWindow confirm config is missing', () => {
      const cws = chatWindowStore.get();
      cws.endChatConfirmMessage = '';
      cws.endChatConfirmLabel = '';
      cws.endChatCancelLabel = '';

      chatStore.askEndChat();
      const confirmBox = chatStore.get().confirmBox;
      expect(confirmBox?.message).toBe('Are you sure you want to end this chat session?');
      expect(confirmBox?.confirmLabel).toBe('End chat');
      expect(confirmBox?.cancelLabel).toBe('Cancel');
    });

    it('uses feature postchatEnabled fallback when override is undefined', () => {
      featuresStore.get().postchatEnabled = true;
      chatStore.confirmEnd();
      expect(chatStore.get().state).toBe('postchat');

      featuresStore.get().postchatEnabled = false;
      chatStore.confirmEnd();
      expect(chatStore.get().state).toBe('closed');
    });
  });

  describe('startFromWelcome and startNew', () => {
    it('uses feature prechatEnabled fallback when override is undefined', () => {
      featuresStore.get().prechatEnabled = true;
      chatStore.startFromWelcome();
      expect(chatStore.get().state).toBe('prechat');

      featuresStore.get().prechatEnabled = false;
      chatStore.startFromWelcome();
      expect(chatStore.get().state).toBe('active');
    });

    it('restarts chat with default agent name fallback', () => {
      chatStore.get().agentName = '';
      chatStore.startNew();
      expect(chatStore.get().messages[0].senderName).toBe('Sarah');
    });
  });

  describe('UI toggles and popups', () => {
    it('closes popups when any popup is open', () => {
      const cs = chatStore.get();
      cs.menuOpen = true;
      chatStore.closePopups();
      expect(cs.menuOpen).toBe(false);

      cs.attachOpen = true;
      chatStore.closePopups();
      expect(cs.attachOpen).toBe(false);

      cs.emojiOpen = true;
      chatStore.closePopups();
      expect(cs.emojiOpen).toBe(false);
    });

    it('does nothing in closePopups when no popups are open', () => {
      const cs = chatStore.get();
      cs.menuOpen = false;
      cs.attachOpen = false;
      cs.emojiOpen = false;

      const fn = vi.fn();
      const unsub = subscribe('store:chat', fn);
      chatStore.closePopups();
      expect(fn).not.toHaveBeenCalled();
      unsub();
    });

    it('toggles menu, attach, and emoji state cleanly', () => {
      chatStore.toggleMenu();
      expect(chatStore.get().menuOpen).toBe(true);

      chatStore.toggleAttach();
      expect(chatStore.get().attachOpen).toBe(true);
      expect(chatStore.get().emojiOpen).toBe(false);

      chatStore.toggleEmoji();
      expect(chatStore.get().emojiOpen).toBe(true);
      expect(chatStore.get().attachOpen).toBe(false);
    });

    it('handles closePanel and toggleExpand', () => {
      const cs = chatStore.get();
      chatStore.toggleExpand();
      expect(cs.isExpanded).toBe(true);

      const closeListener = vi.fn();
      window.addEventListener('close-contact-widget', closeListener);

      chatStore.closePanel();
      expect(cs.panelOpen).toBe(false);
      expect(cs.isExpanded).toBe(false);
      expect(closeListener).toHaveBeenCalled();

      window.removeEventListener('close-contact-widget', closeListener);
    });

    it('handles insertEmoji', () => {
      const cs = chatStore.get();
      cs.draft = 'Hello ';
      chatStore.insertEmoji('👋');
      expect(cs.draft).toBe('Hello 👋');
    });
  });

  describe('postchat submit & offline submission', () => {
    it('submits postchat feedback and sets state based on welcome card configuration', () => {
      const cws = chatWindowStore.get();
      if (!cws.welcome) cws.welcome = { enabled: true } as any;

      if (cws.welcome) {
        cws.welcome.enabled = false;
        chatStore.submitPostchat({ comment: 'Great' });
        expect(chatStore.get().state).toBe('active');

        cws.welcome.enabled = true;
        chatStore.submitPostchat({ comment: 'Awesome' });
        expect(chatStore.get().state).toBe('welcome');
      }
    });

    it('handles submitPrechat', () => {
      const cs = chatStore.get();
      chatStore.submitPrechat({ name: 'Jane', email: 'jane@example.com' });
      expect(cs.offlineName).toBe('Jane');
      expect(cs.offlineEmail).toBe('jane@example.com');
      expect(cs.panelOpen).toBe(true);
      expect(cs.state).toBe('active');
    });

    it('handles submitOfflinePayload with fake timer', () => {
      vi.useFakeTimers();
      chatStore.submitOfflinePayload({ name: 'Bob', email: 'bob@example.com', message: 'Hello' });
      expect(chatStore.get().offlineSending).toBe(true);

      vi.advanceTimersByTime(1000);
      expect(chatStore.get().offlineSending).toBe(false);
      expect(chatStore.get().state).toBe('offline-sent');
      vi.useRealTimers();
    });

    it('handles submitOffline with fake timer and missing fields condition', () => {
      vi.useFakeTimers();
      const cs = chatStore.get();
      cs.offlineEmail = '';
      cs.offlineMessage = '';
      chatStore.submitOffline();
      expect(cs.offlineSending).toBe(false);

      cs.offlineEmail = 'test@example.com';
      cs.offlineMessage = 'Test msg';
      chatStore.submitOffline();
      expect(cs.offlineSending).toBe(true);

      vi.advanceTimersByTime(1200);
      expect(cs.offlineSending).toBe(false);
      expect(cs.state).toBe('offline-sent');
      vi.useRealTimers();
    });
  });

  describe('uploadImage & captureScreenshot', () => {
    it('handles uploadImage when no file is selected', () => {
      const emptyInput = { files: null } as unknown as HTMLInputElement;
      chatStore.uploadImage(emptyInput);

      const emptyInput2 = { files: [] } as unknown as HTMLInputElement;
      chatStore.uploadImage(emptyInput2);
    });

    it('handles uploadImage async status flow and bot response', () => {
      vi.useFakeTimers();
      URL.createObjectURL = vi.fn().mockReturnValue('blob:test');

      const file = new File(['data'], 'photo.png', { type: 'image/png' });
      const input = { files: [file] } as unknown as HTMLInputElement;

      const cs = chatStore.get();
      cs.panelOpen = false;
      cs.unreadCount = 0;
      chatStore.uploadImage(input);

      const imgMsg = cs.messages[cs.messages.length - 1];
      expect(imgMsg.attachment).toBe(true);

      vi.advanceTimersByTime(2000);
      expect(cs.messages.find((m) => m.key === imgMsg.key)?.status).toBe('delivered');

      vi.advanceTimersByTime(2000);
      expect(cs.messages.find((m) => m.key === imgMsg.key)?.status).toBe('read');

      vi.advanceTimersByTime(1000);
      expect(cs.unreadCount).toBe(1);
      expect(cs.messages[cs.messages.length - 1].senderType).toBe('AGENT');

      vi.useRealTimers();
    });

    it('handles captureScreenshot and downloadTranscript and toggleSounds and dismissConsent', () => {
      // captureScreenshot: verify window event is dispatched (no alert)
      const screenshotEvents: Event[] = [];
      const screenshotHandler = (e: Event) => screenshotEvents.push(e);
      window.addEventListener('cw:capture-screenshot-request', screenshotHandler);
      chatStore.captureScreenshot();
      window.removeEventListener('cw:capture-screenshot-request', screenshotHandler);
      expect(screenshotEvents).toHaveLength(1);

      // downloadTranscript: verify Blob URL is created (no alert)
      const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      const origCreate = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = origCreate(tag);
        if (tag === 'a') vi.spyOn(el as HTMLAnchorElement, 'click').mockImplementation(() => {});
        return el;
      });
      chatStore.downloadTranscript();
      expect(createSpy).toHaveBeenCalledWith(expect.any(Blob));

      const initialSounds = chatStore.get().soundsOn;
      chatStore.toggleSounds();
      expect(chatStore.get().soundsOn).toBe(!initialSounds);

      chatStore.dismissConsent();
      expect(chatStore.get().consentDismissed).toBe(true);
    });
  });

  describe('chatStore.sendCroppedImage', () => {
    it('does nothing when dataUrl is empty or not a data: URI', () => {
      const s = chatStore.get();
      const before = s.messages.length;
      chatStore.sendCroppedImage('');
      chatStore.sendCroppedImage('https://example.com/image.png');
      expect(s.messages.length).toBe(before);
    });

    it('adds a proper attachment message with the full data URL as localUrl', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';
      const s = chatStore.get();
      const before = s.messages.length;

      chatStore.sendCroppedImage(dataUrl);

      expect(s.messages.length).toBe(before + 1);
      const msg = s.messages[s.messages.length - 1];
      expect(msg.senderType).toBe('VISITOR');
      expect(msg.attachment).toBe(true);
      expect(msg.localUrl).toBe(dataUrl);
      expect(msg.body).toBe('');
      expect(msg.status).toBe('sent');
      expect(msg.key).toMatch(/^img_cropped_/);
    });

    it('marks hasSentMessage and closes attach panel', () => {
      const s = chatStore.get();
      s.attachOpen = true;
      s.hasSentMessage = false;

      chatStore.sendCroppedImage('data:image/png;base64,abc');

      expect(s.hasSentMessage).toBe(true);
      expect(s.attachOpen).toBe(false);
    });

    it('emits store:chat immediately', () => {
      const listener = vi.fn();
      const unsub = subscribe('store:chat', listener);
      chatStore.sendCroppedImage('data:image/png;base64,abc');
      expect(listener).toHaveBeenCalled();
      unsub();
    });

    it('runs delivered → read → bot reply async sequence', () => {
      vi.useFakeTimers();
      const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';
      const s = chatStore.get();
      s.panelOpen = false;
      s.unreadCount = 0;

      chatStore.sendCroppedImage(dataUrl);

      const msg = s.messages[s.messages.length - 1];
      expect(msg.status).toBe('sent');

      vi.advanceTimersByTime(2000);
      expect(s.messages.find((m) => m.key === msg.key)?.status).toBe('delivered');

      vi.advanceTimersByTime(2000);
      expect(s.messages.find((m) => m.key === msg.key)?.status).toBe('read');

      vi.advanceTimersByTime(1000);
      const lastMsg = s.messages[s.messages.length - 1];
      expect(lastMsg.senderType).toBe('AGENT');
      expect(lastMsg.body).toContain('image');
      expect(s.unreadCount).toBe(1);

      vi.useRealTimers();
    });

    it('does not increment unreadCount when panel is open', () => {
      vi.useFakeTimers();
      const s = chatStore.get();
      s.panelOpen = true;
      s.unreadCount = 0;

      chatStore.sendCroppedImage('data:image/png;base64,abc');
      vi.advanceTimersByTime(5000);

      expect(s.unreadCount).toBe(0);
      vi.useRealTimers();
    });
  });

  describe('message helpers: groupStart and groupEnd', () => {
    it('evaluates groupStart and groupEnd across list boundaries and sender transitions', () => {
      const cs = chatStore.get();
      cs.messages = [
        { key: '1', senderType: 'VISITOR', body: 'Msg 1' },
        { key: '2', senderType: 'VISITOR', body: 'Msg 2' },
        { key: '3', senderType: 'AGENT', body: 'Msg 3' },
      ];

      expect(chatStore.groupStart(0)).toBe(true);
      expect(chatStore.groupStart(1)).toBe(false);
      expect(chatStore.groupStart(2)).toBe(true);

      expect(chatStore.groupEnd(0)).toBe(false);
      expect(chatStore.groupEnd(1)).toBe(true);
      expect(chatStore.groupEnd(2)).toBe(true);

      expect(chatStore.dividerBefore(0)).toBe(true);
      expect(chatStore.dividerBefore(1)).toBe(false);
      expect(chatStore.dayLabel()).toBe('Today');
      expect(chatStore.timeLabel(cs.messages[0])).toBeDefined();
      expect(chatStore.attachmentUrl(cs.messages[0])).toBe('');
    });
  });

  describe('updateStoreConfig and applyStoreConfig', () => {
    it('handles overrides when sub-objects like welcome or inputBox are null/undefined', () => {
      const cws = chatWindowStore.get();
      const gws = greetWindowStore.get();
      (cws as any).welcome = undefined;
      (gws as any).inputBox = undefined;

      expect(() => {
        updateStoreConfig({
          enableWelcomeCard: true,
          enableInputCard: true,
          inputBoxDelaySec: 5,
          inputBoxAnimOpenSec: 2,
        });
      }).not.toThrow();
    });

    it('handles all numeric animation and delay overrides', () => {
      updateStoreConfig({
        greetDelaySec: 4,
        greetAnimOpenSec: 0.8,
        greetAnimCloseSec: 0.4,
        inputBoxDelaySec: 6,
        inputBoxAnimOpenSec: 0.9,
        chatAnimStyle: 'slide-up',
        chatAnimOpenSec: 0.6,
        chatAnimCloseSec: 0.5,
      });

      const gw = greetWindowStore.get();
      const cw = chatWindowStore.get();
      expect(gw.openingTimeAfterInitialLoadSec).toBe(4);
      expect(gw.animationOpeningSec).toBe(0.8);
      expect(gw.animationClosingSec).toBe(0.4);
      expect(gw.inputBox?.openingTimeAfterInitialLoadSec).toBe(6);
      expect(gw.inputBox?.animationOpeningSec).toBe(0.9);
      expect(cw.animationStyle).toBe('slide-up');
      expect(cw.animationOpeningSec).toBe(0.6);
      expect(cw.animationClosingSec).toBe(0.5);
    });

    it('handles triggerType options', () => {
      updateStoreConfig({ triggerType: 'chatbar' });
      expect(chatbarStore.get().enabled).toBe(true);
      expect(bubbleStore.get().enabled).toBe(false);

      updateStoreConfig({ triggerType: 'chatcard' });
      expect(chatbarStore.get().enabled).toBe(true);

      updateStoreConfig({ triggerType: 'bubble' });
      expect(bubbleStore.get().enabled).toBe(true);
      expect(chatbarStore.get().enabled).toBe(false);

      updateStoreConfig({ triggerType: 'unknown' as any });
    });

    it('handles explicit bubble, chatbar, greetWindow, chatWindow, chat, and features overrides', () => {
      updateStoreConfig({
        bubble: { width: 55 },
        chatbar: { text: 'Custom Chatbar' },
        greetWindow: { title: 'Custom Greet', inputBox: { placeholder: 'Type...' } },
        chatWindow: { welcome: { title: 'Custom Welcome' }, clientName: 'Custom Client' },
        chat: { draft: 'Custom Draft' },
        features: { voiceCallEnabled: true, videoCallEnabled: true },
      });

      expect(bubbleStore.get().width).toBe(55);
      expect(chatbarStore.get().text).toBe('Custom Chatbar');
      expect(greetWindowStore.get().title).toBe('Custom Greet');
      expect(greetWindowStore.get().inputBox?.placeholder).toBe('Type...');
      expect(chatWindowStore.get().welcome?.title).toBe('Custom Welcome');
      expect(chatWindowStore.get().clientName).toBe('Custom Client');
      expect(chatStore.get().draft).toBe('Custom Draft');
      expect(featuresStore.get().voiceCallEnabled).toBe(true);
    });

    it('triggers setupGreetTimers when touchedGreetTimers condition is met via greetWindow object', () => {
      vi.useFakeTimers();
      updateStoreConfig({
        greetWindow: {
          openingTimeAfterInitialLoadSec: 1,
          enabled: true,
          inputBox: {
            openingTimeAfterInitialLoadSec: 2,
            enabled: true,
          },
        },
      });

      vi.advanceTimersByTime(2500);
      expect(greetWindowStore.get().visible).toBe(true);
      vi.useRealTimers();
    });

    it('applies enableWelcomeCard, enableGreetWindow, and enableInputCard overrides when store is initialized', () => {
      updateStoreConfig({
        enableWelcomeCard: false,
        enableGreetWindow: false,
        enableInputCard: false,
      });
      expect(chatWindowStore.get().welcome?.enabled).toBe(false);
      expect(greetWindowStore.get().enabled).toBe(false);
      expect(greetWindowStore.get().inputBox?.enabled).toBe(false);
    });
  });

  describe('exportFullStoreConfig and injectStoreConfig', () => {
    it('uses fallbacks in exportFullStoreConfig when clientName is missing', () => {
      chatStore.get().clientName = '';
      const exp = exportFullStoreConfig();
      expect(exp.clientId).toBe('default');
      expect(exp.clientName).toBe('Default Widget');
    });

    it('handles injectStoreConfig with partial tokens and chatConfig alias', () => {
      injectStoreConfig({
        features: { voiceCallEnabled: true },
        chatConfig: { agentName: 'Custom Agent' },
        messages: [{ key: '1', senderType: 'AGENT', body: 'Injected' }],
        clientName: 'Injected Client',
      });

      expect(featuresStore.get().voiceCallEnabled).toBe(true);
      expect(chatStore.get().clientName).toBe('Injected Client');
    });
  });

  describe('setupGreetTimers', () => {
    it('returns early when greetWindow is disabled', () => {
      const gw = greetWindowStore.get();
      gw.enabled = false;
      setupGreetTimers();
      expect(gw.visible).toBe(false);
    });

    it('early terminates timers if greetWindow is dismissed or message is sent', () => {
      vi.useFakeTimers();
      const gw = greetWindowStore.get();
      gw.enabled = true;
      gw.dismissed = false;
      gw.openingTimeAfterInitialLoadSec = 1;
      if (gw.inputBox) {
        gw.inputBox.enabled = true;
        gw.inputBox.openingTimeAfterInitialLoadSec = 2;
      }

      setupGreetTimers();

      // Dismiss before timer fires
      gw.dismissed = true;
      vi.advanceTimersByTime(2500);
      expect(gw.visible).toBe(false);
      expect(gw.inputBox?.visible).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('initStore & remote configuration processing', () => {
    it('processes remote config with rootAccentColor (without website theme)', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          accentColor: '#ff5500',
          bubble: { useWebsiteTheme: false, backgroundColor: '', outlineRing: {} },
          greetWindow: {
            useWebsiteTheme: false,
            inputBox: { layout: 'separated', buttonIconColor: '' },
          },
          chatbar: { useWebsiteTheme: false, layout: 'bar', barOffsetRight: 30, barOffsetBottom: 20 },
          chatWindow: {
            useWebsiteTheme: false,
            welcome: { useWebsiteTheme: false, bgGradient: '' },
            clientName: 'Accent Client',
            agentName: 'Accent Agent',
          },
          features: { videoCallEnabled: true },
        }),
      });

      await initStore();

      expect(bubbleStore.get().backgroundColor).toBe('#ff5500');
      expect(greetWindowStore.get().iconColor).toBe('#ff5500');
      expect(chatbarStore.get().bgColor).toBe('#ff5500');
      expect(chatWindowStore.get().accentColor).toBe('#ff5500');
      expect(featuresStore.get().videoCallEnabled).toBe(true);
      expect(chatStore.get().agentName).toBe('Accent Agent');
      if (chatStore.get().messages[0]) {
        expect(chatStore.get().messages[0].senderName).toBe('Accent Agent');
      }
    });

    it('processes remote config with non-separated inputBox layout using rootAccentColor', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          accentColor: '#00aa55',
          greetWindow: {
            useWebsiteTheme: false,
            inputBox: { layout: 'inline', buttonColor: '' },
          },
          chatbar: {
            useWebsiteTheme: false,
            layout: 'card',
            cardOffsetRight: 15,
            cardOffsetBottom: 25,
          },
        }),
      });

      await initStore();
      expect(greetWindowStore.get().inputBox?.buttonColor).toBe('#00aa55');
      expect(chatbarStore.get().offsetRight).toBe(15);
    });

    it('processes remote config with website theme when secondary theme differs from primary', async () => {
      document.documentElement.style.setProperty('--primary-color', '#112233');
      document.documentElement.style.setProperty('--secondary-color', '#445566');

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          chatWindow: {
            useWebsiteTheme: true,
            welcome: { useWebsiteTheme: true },
          },
          greetWindow: {
            useWebsiteTheme: true,
            inputBox: { layout: 'inline' },
          },
        }),
      });

      await initStore();
      expect(greetWindowStore.get().inputBox?.buttonColor).toBe('#112233');
      expect(chatWindowStore.get().welcome?.bgGradient).toContain('#445566');

      document.documentElement.style.removeProperty('--primary-color');
      document.documentElement.style.removeProperty('--secondary-color');
    });

    it('processes chatbar with useWebsiteTheme in remote config', async () => {
      const cs = chatStore.get();
      cs.hasSentMessage = false;
      cs.state = 'active';

      document.documentElement.style.setProperty('--primary-color', '#ff00ff');
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          chatbar: { useWebsiteTheme: true },
          chatWindow: { welcome: { enabled: true } },
        }),
      });

      await initStore();

      expect(chatbarStore.get().bgColor).toBe('#ff00ff');
      expect(chatStore.get().state).toBe('welcome');

      document.documentElement.style.removeProperty('--primary-color');
    });

    it('catches and logs warning on initStore fetch failure', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const badResponse = {
        ok: true,
        json: async () => ({
          bubble: { useWebsiteTheme: true, outlineRing: true },
        }),
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(badResponse as Response);
      vi.spyOn(window, 'fetch').mockResolvedValue(badResponse as Response);

      await initStore();

      expect(warnSpy).toHaveBeenCalledWith('initStore fetchClientConfig warning:', expect.any(Error));
      warnSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // downloadTranscript — real Blob-based file download (no alert)
  // ---------------------------------------------------------------------------
  describe('chatStore.downloadTranscript', () => {
    it('closes the menu and emits store:chat', () => {
      const s = chatStore.get();
      s.menuOpen = true;
      const listener = vi.fn();
      const unsub = subscribe('store:chat', listener);
      chatStore.downloadTranscript();
      expect(s.menuOpen).toBe(false);
      expect(listener).toHaveBeenCalled();
      unsub();
    });

    it('creates a Blob URL and triggers an anchor download click', () => {
      // Install fake timers BEFORE calling downloadTranscript so the
      // internal setTimeout(100ms) is captured and can be flushed.
      vi.useFakeTimers();

      const mockUrl = 'blob:mock-url';
      const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      const clickSpy = vi.fn();
      const originalCreate = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = originalCreate(tag);
        if (tag === 'a') {
          vi.spyOn(el as HTMLAnchorElement, 'click').mockImplementation(clickSpy);
        }
        return el;
      });

      chatStore.downloadTranscript();

      expect(createSpy).toHaveBeenCalledWith(expect.any(Blob));
      expect(clickSpy).toHaveBeenCalled();

      // Flush the 100ms revoke timer
      vi.runAllTimers();
      expect(revokeSpy).toHaveBeenCalledWith(mockUrl);

      vi.useRealTimers();
    });

    it('includes message bodies in the downloaded transcript text', () => {
      const s = chatStore.get();
      s.messages = [
        { key: 'm1', senderType: 'AGENT', senderName: 'Sarah', body: 'Hello there', created: new Date().toISOString() },
        { key: 'm2', senderType: 'VISITOR', body: 'Hi, I need help', created: new Date().toISOString() },
      ];

      let capturedBlob: Blob | undefined;
      vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => {
        capturedBlob = b as Blob;
        return 'blob:mock';
      });
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      const originalCreate = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = originalCreate(tag);
        if (tag === 'a') vi.spyOn(el as HTMLAnchorElement, 'click').mockImplementation(() => {});
        return el;
      });

      chatStore.downloadTranscript();

      expect(capturedBlob).toBeDefined();
      // Read the Blob text to confirm messages are included
      return capturedBlob!.text().then((text) => {
        expect(text).toContain('Hello there');
        expect(text).toContain('Hi, I need help');
        expect(text).toContain('You');
        expect(text).toContain('Sarah');
      });
    });

    it('labels attachment messages correctly in the transcript', () => {
      const s = chatStore.get();
      s.messages = [
        { key: 'img1', senderType: 'VISITOR', body: '', attachment: true, created: new Date().toISOString() },
      ];

      let capturedBlob: Blob | undefined;
      vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => { capturedBlob = b as Blob; return 'blob:mock'; });
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      const originalCreate = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = originalCreate(tag);
        if (tag === 'a') vi.spyOn(el as HTMLAnchorElement, 'click').mockImplementation(() => {});
        return el;
      });

      chatStore.downloadTranscript();

      return capturedBlob!.text().then((text) => {
        expect(text).toContain('[Image attachment]');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // captureScreenshot — dispatches window event, no alert
  // ---------------------------------------------------------------------------
  describe('chatStore.captureScreenshot', () => {
    it('closes the attach panel and emits store:chat', () => {
      const s = chatStore.get();
      s.attachOpen = true;
      const listener = vi.fn();
      const unsub = subscribe('store:chat', listener);
      chatStore.captureScreenshot();
      expect(s.attachOpen).toBe(false);
      expect(listener).toHaveBeenCalled();
      unsub();
    });

    it('dispatches a cw:capture-screenshot-request window event with a timestamp', () => {
      const received: CustomEvent[] = [];
      const handler = (e: Event) => received.push(e as CustomEvent);
      window.addEventListener('cw:capture-screenshot-request', handler);

      chatStore.captureScreenshot();

      window.removeEventListener('cw:capture-screenshot-request', handler);
      expect(received).toHaveLength(1);
      expect(received[0].detail).toHaveProperty('timestamp');
      expect(typeof received[0].detail.timestamp).toBe('string');
    });

    it('does not call alert() — dispatches window event instead', () => {
      // Happy-DOM does not expose window.alert, so we confirm behaviour by
      // verifying the window event is dispatched (which only happens in the
      // new non-alert implementation).
      const received: Event[] = [];
      const handler = (e: Event) => received.push(e);
      window.addEventListener('cw:capture-screenshot-request', handler);
      chatStore.captureScreenshot();
      window.removeEventListener('cw:capture-screenshot-request', handler);
      expect(received).toHaveLength(1);
    });
  });

  describe('additional branch coverage for chatStore', () => {
    it('executes downloadTranscript revokeObjectURL timer', () => {
      vi.useFakeTimers();
      const originalCreate = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = originalCreate(tag);
        if (tag === 'a') vi.spyOn(el as HTMLAnchorElement, 'click').mockImplementation(() => {});
        return el;
      });

      chatStore.downloadTranscript();
      vi.advanceTimersByTime(150);
      vi.useRealTimers();
    });

    it('handles sendCroppedImage timers and delivered/read/reply status when panelOpen is false', () => {
      vi.useFakeTimers();
      const s = chatStore.get();
      s.panelOpen = false;
      s.messages = [];

      chatStore.sendCroppedImage('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
      expect(s.hasSentMessage).toBe(true);

      vi.advanceTimersByTime(5500);
      expect(s.messages.some(m => m.senderType === 'AGENT')).toBe(true);
      expect(s.unreadCount).toBeGreaterThan(0);
      vi.useRealTimers();
    });

    it('handles dividerBefore for index > 0', () => {
      expect(chatStore.dividerBefore(0)).toBe(true);
      expect(chatStore.dividerBefore(1)).toBe(false);
    });

    it('handles cancelEndChat and dismissGreetWindow', () => {
      chatStore.cancelEndChat();
      expect(chatStore.get().confirmBox).toBeNull();
      chatStore.dismissGreetWindow();
      expect(greetWindowStore.get().dismissed).toBe(true);
    });

    it('handles initStore with useWebsiteTheme in dark mode, separated and inline inputBox layouts, and cc.dark overrides', async () => {
      document.documentElement.classList.add('dark');

      // Test 1: layout = 'separated'
      let mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          greetWindow: {
            useWebsiteTheme: true,
            inputBox: { layout: 'separated' },
          },
          chatWindow: {
            useWebsiteTheme: true,
            dark: { headerBg: '#121212' },
          },
        }),
      });
      window.fetch = mockFetch;
      globalThis.fetch = mockFetch;
      await initStore();
      expect(greetWindowStore.get().inputBox?.buttonIconColor).toBeDefined();
      expect(chatWindowStore.get().headerBg).toBe('#121212');

      // Test 2: layout = 'inline'
      mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          greetWindow: {
            useWebsiteTheme: true,
            inputBox: { layout: 'inline' },
          },
          chatWindow: {
            useWebsiteTheme: true,
            dark: { headerBg: '#121212' },
          },
        }),
      });
      window.fetch = mockFetch;
      await initStore();
      expect(greetWindowStore.get().inputBox?.buttonColor).toBeDefined();
      document.documentElement.classList.remove('dark');
    });

    it('handles processRemoteConfig with rootAccentColor and separated or inline inputBox layout', async () => {
      let mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          accentColor: '#123456',
          greetWindow: {
            inputBox: { layout: 'separated', buttonIconColor: '' },
          },
        }),
      });
      window.fetch = mockFetch;
      globalThis.fetch = mockFetch;
      await initStore();
      expect(greetWindowStore.get().inputBox?.buttonIconColor).toBe('#123456');

      mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          accentColor: '#123456',
          greetWindow: {
            inputBox: { layout: 'inline', buttonColor: '' },
          },
        }),
      });
      window.fetch = mockFetch;
      globalThis.fetch = mockFetch;
      await initStore();
      expect(greetWindowStore.get().inputBox?.buttonColor).toBe('#123456');
    });
  });

  describe('chat-store 100% coverage additions', () => {
    it('resolves whenStoreReady after initStore completes', async () => {
      await expect(whenStoreReady()).resolves.toBeUndefined();
    });

    it('does not send when both draft and override are empty strings', () => {
      const cs = chatStore.get();
      cs.draft = '';
      const len = cs.messages.length;
      chatStore.send();
      chatStore.send('');
      expect(cs.messages.length).toBe(len);
    });

    it('falls back to Sarah for typing indicator and bot reply when agentName is empty', () => {
      vi.useFakeTimers();
      const cs = chatStore.get();
      cs.agentName = '';
      cs.panelOpen = false;

      chatStore.send('hello');
      vi.advanceTimersByTime(2800);
      expect(cs.typingName).toBe('Sarah');

      vi.advanceTimersByTime(1700);
      expect(cs.messages[cs.messages.length - 1].senderName).toBe('Sarah');
      vi.useRealTimers();
    });

    it('uses Sarah fallback in uploadImage bot reply when agentName is empty', () => {
      vi.useFakeTimers();
      URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
      const cs = chatStore.get();
      cs.agentName = '';
      cs.panelOpen = false;

      const file = new File(['data'], 'photo.png', { type: 'image/png' });
      chatStore.uploadImage({ files: [file] } as unknown as HTMLInputElement);

      vi.advanceTimersByTime(5000);
      expect(cs.messages[cs.messages.length - 1].senderName).toBe('Sarah');
      vi.useRealTimers();
    });

    it('uses Sarah fallback in sendCroppedImage bot reply when agentName is empty', () => {
      vi.useFakeTimers();
      const cs = chatStore.get();
      cs.agentName = '';
      cs.panelOpen = false;

      chatStore.sendCroppedImage('data:image/png;base64,abc');

      vi.advanceTimersByTime(5000);
      expect(cs.messages[cs.messages.length - 1].senderName).toBe('Sarah');
      vi.useRealTimers();
    });

    it('uses false feature fallbacks in confirmEnd and startFromWelcome when features are undefined', () => {
      featuresStore.get().postchatEnabled = undefined as any;
      chatStore.confirmEnd();
      expect(chatStore.get().state).toBe('closed');

      featuresStore.get().prechatEnabled = undefined as any;
      chatStore.startFromWelcome();
      expect(chatStore.get().state).toBe('active');
    });

    it('uses fallback names in downloadTranscript when client/agent names are missing', async () => {
      const cs = chatStore.get();
      cs.clientName = '';
      cs.agentName = '';
      cs.messages = [
        { key: 'a', senderType: 'AGENT', senderName: 'Bob', body: 'from bob' },
        { key: 'b', senderType: 'AGENT', body: 'no name' },
        { key: 'c', senderType: 'VISITOR', body: 'visitor says' },
        { key: 'd', senderType: 'AGENT', body: '' },
      ];

      let capturedBlob: Blob | undefined;
      vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => { capturedBlob = b as Blob; return 'blob:m'; });
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      const originalCreate = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = originalCreate(tag);
        if (tag === 'a') vi.spyOn(el as HTMLAnchorElement, 'click').mockImplementation(() => {});
        return el;
      });

      chatStore.downloadTranscript();

      const text = await capturedBlob!.text();
      expect(text).toContain('Chat Transcript — Support');
      expect(text).toContain('Agent: Agent');
      expect(text).toContain('Bob');
      expect(text).toContain('You');
    });

    it('handles a null messages list in downloadTranscript', async () => {
      const cs = chatStore.get();
      cs.messages = null as unknown as Message[];

      let capturedBlob: Blob | undefined;
      vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => { capturedBlob = b as Blob; return 'blob:m'; });
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      const originalCreate = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = originalCreate(tag);
        if (tag === 'a') vi.spyOn(el as HTMLAnchorElement, 'click').mockImplementation(() => {});
        return el;
      });

      chatStore.downloadTranscript();

      const text = await capturedBlob!.text();
      expect(text).toContain('Chat Transcript');
    });

    it('handles submitPostchat without a values payload', () => {
      const cs = chatStore.get();
      chatStore.submitPostchat(undefined as any);
      expect(cs.lastFeedback).toEqual({});
      expect(cs.panelOpen).toBe(false);
    });

    it('timeLabel falls back to now when created is missing', () => {
      expect(chatStore.timeLabel({ key: 'x', senderType: 'AGENT', body: 'hi' })).toBeDefined();
      expect(
        chatStore.timeLabel({ key: 'y', senderType: 'AGENT', body: 'hi', created: new Date().toISOString() })
      ).toBeDefined();
    });

    it('honors explicit overrides in confirmEnd and startFromWelcome', () => {
      chatStore.confirmEnd(true);
      expect(chatStore.get().state).toBe('postchat');

      chatStore.confirmEnd(false);
      expect(chatStore.get().state).toBe('closed');

      chatStore.startFromWelcome(true);
      expect(chatStore.get().state).toBe('prechat');

      chatStore.startFromWelcome(false);
      expect(chatStore.get().state).toBe('active');
    });

    it('processes bubble position and welcome fallback when chatWindow lacks welcome', async () => {
      document.documentElement.style.setProperty('--primary-color', '#333333');
      document.documentElement.style.setProperty('--secondary-color', '#333333');
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          bubble: { useWebsiteTheme: true, position: 'bottom-left' },
          chatWindow: { useWebsiteTheme: false, clientName: 'No Welcome' },
        }),
      });

      await initStore();

      expect(greetWindowStore.get().position).toBe('bottom-left');
      const welcome = chatWindowStore.get().welcome;
      expect(welcome).toBeDefined();
      expect(welcome?.bgGradient).toContain('#333333');

      document.documentElement.style.removeProperty('--primary-color');
      document.documentElement.style.removeProperty('--secondary-color');
    });

    it('skips accent fallbacks when chatWindow values are already set', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          accentColor: '#ff0000',
          chatWindow: {
            endChatConfirmBg: '#010101',
            welcome: { useWebsiteTheme: false, bgGradient: '', buttonIconColor: '#abcdef' },
          },
        }),
      });

      await initStore();

      expect(chatWindowStore.get().endChatConfirmBg).toBe('#010101');
      expect(chatWindowStore.get().welcome?.buttonIconColor).toBe('#abcdef');
    });

    it('uses default greet timings when opening delays are undefined', () => {
      vi.useFakeTimers();
      const gw = greetWindowStore.get();
      gw.enabled = true;
      gw.dismissed = false;
      gw.visible = false;
      chatStore.get().hasSentMessage = false;
      (gw as any).openingTimeAfterInitialLoadSec = undefined;
      if (gw.inputBox) {
        (gw.inputBox as any).enabled = true;
        (gw.inputBox as any).openingTimeAfterInitialLoadSec = undefined;
      }

      setupGreetTimers();

      vi.advanceTimersByTime(2100);
      expect(greetWindowStore.get().visible).toBe(true);

      vi.advanceTimersByTime(2000);
      expect(greetWindowStore.get().inputBox?.visible).toBe(true);
      vi.useRealTimers();
    });

    it('injectStoreConfig tolerates missing or empty tokens', () => {
      expect(() => injectStoreConfig(undefined as any)).not.toThrow();
      expect(() => injectStoreConfig(null as any)).not.toThrow();
      expect(() => injectStoreConfig({ chat: { draft: 'hello' } })).not.toThrow();
      expect(chatStore.get().draft).toBe('hello');
    });

    it('updateStoreConfig ignores falsy or non-object overrides', () => {
      expect(() => updateStoreConfig(undefined as any)).not.toThrow();
      expect(() => updateStoreConfig(null as any)).not.toThrow();
      expect(() => updateStoreConfig(42 as any)).not.toThrow();
    });

    it('queues overrides while the store is still initializing', async () => {
      _resetStoreForTest();

      let resolveFetch!: (value: unknown) => void;
      const pendingFetch = new Promise((resolve) => { resolveFetch = resolve; });
      globalThis.fetch = vi.fn().mockReturnValue(pendingFetch);

      const initPromise = initStore();

      updateStoreConfig({ bubble: { width: 77 } });
      expect(bubbleStore.get().width).not.toBe(77);

      resolveFetch({ ok: true, json: async () => ({}) });
      await initPromise;

      expect(bubbleStore.get().width).toBe(77);
    });

    it('handles falsy guards in send, dismissGreetWindow, and submit helpers', () => {
      const gw = greetWindowStore.get();
      (gw as any).inputBox = undefined;
      const cs = chatStore.get();

      chatStore.send('hello');
      chatStore.dismissGreetWindow();
      expect(gw.dismissed).toBe(true);

      chatStore.submitPrechat({});
      expect(cs.offlineName).toBe('');
      expect(cs.offlineEmail).toBe('');

      chatStore.submitOfflinePayload({});
    });

    it('handles missing messages in send delivered/read timers', () => {
      vi.useFakeTimers();
      const cs = chatStore.get();
      cs.panelOpen = false;

      chatStore.send('ghost');
      const sent = cs.messages[cs.messages.length - 1];
      cs.messages = cs.messages.filter((m) => m.key !== sent.key);

      vi.advanceTimersByTime(5000);
      expect(cs.messages.some((m) => m.senderType === 'AGENT')).toBe(true);
      vi.useRealTimers();
    });

    it('handles missing messages in uploadImage timers and bot reply with panel open', () => {
      vi.useFakeTimers();
      URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
      const cs = chatStore.get();
      cs.panelOpen = true;
      cs.unreadCount = 0;

      const file = new File(['data'], 'photo.png', { type: 'image/png' });
      chatStore.uploadImage({ files: [file] } as unknown as HTMLInputElement);

      const imgMsg = cs.messages[cs.messages.length - 1];
      cs.messages = cs.messages.filter((m) => m.key !== imgMsg.key);

      vi.advanceTimersByTime(5000);
      expect(cs.unreadCount).toBe(0);
      vi.useRealTimers();
    });

    it('handles missing messages in sendCroppedImage timers', () => {
      vi.useFakeTimers();
      const cs = chatStore.get();

      chatStore.sendCroppedImage('data:image/png;base64,abc');
      const imgMsg = cs.messages[cs.messages.length - 1];
      cs.messages = cs.messages.filter((m) => m.key !== imgMsg.key);

      vi.advanceTimersByTime(5000);
      vi.useRealTimers();
    });

    it('covers greetWindow, bubble, chatbar, and welcome initStore edge branches', async () => {
      // Config 1: accent path, all fallbacks already set (skip sides), card layout without offsets
      let mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          accentColor: '#ff0000',
          bubble: { useWebsiteTheme: false, backgroundColor: '#010101' },
          greetWindow: {
            useWebsiteTheme: false,
            iconColor: '#abcdef',
            inputBox: { layout: 'separated', buttonIconColor: '#00aa11' },
          },
          chatbar: { layout: 'card' },
          chatWindow: {
            useWebsiteTheme: false,
            accentColor: '#111111',
            visitorBubbleBg: '#222222',
            headerBg: '#333333',
            agentAvatarBg: '#444444',
            inputFocusBorderColor: '#555555',
            inputFocusShadow: '0 0 0 2px #666666',
            sendButtonBgActive: '#777777',
            poweredByColor: '#888888',
            endChatConfirmBg: '#020202',
          },
        }),
      });
      window.fetch = mockFetch;
      globalThis.fetch = mockFetch;
      await initStore();
      expect(greetWindowStore.get().iconColor).toBe('#abcdef');
      expect(greetWindowStore.get().inputBox?.buttonIconColor).toBe('#00aa11');
      expect(chatbarStore.get().layout).toBe('card');
      expect(chatWindowStore.get().endChatConfirmBg).toBe('#020202');
      expect(chatWindowStore.get().accentColor).toBe('#111111');

      // Config 2: website-theme path, no outlineRing and no greet inputBox (guard skip sides)
      mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          bubble: { useWebsiteTheme: true },
          greetWindow: { useWebsiteTheme: true },
          chatWindow: { useWebsiteTheme: true },
        }),
      });
      window.fetch = mockFetch;
      globalThis.fetch = mockFetch;
      await initStore();
      expect(greetWindowStore.get().iconColor).toBeDefined();

      // Config 3: accent inline with buttonColor already set + welcome buttonIconColor set
      mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          accentColor: '#00ff00',
          greetWindow: {
            useWebsiteTheme: false,
            inputBox: { layout: 'inline', buttonColor: '#123456' },
          },
          chatWindow: {
            useWebsiteTheme: false,
            welcome: { useWebsiteTheme: false, bgGradient: '', buttonIconColor: '#fedcba' },
          },
        }),
      });
      window.fetch = mockFetch;
      globalThis.fetch = mockFetch;
      await initStore();
      expect(greetWindowStore.get().inputBox?.buttonColor).toBe('#123456');
      expect(chatWindowStore.get().welcome?.buttonIconColor).toBe('#fedcba');

      // Config 4: accent bubble with outlineRing color set (960 false side) and greetWindow without inputBox (985 false side)
      mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          accentColor: '#aaaaaa',
          bubble: { useWebsiteTheme: false, backgroundColor: '', outlineRing: { color: '#bbbbbb' } },
          greetWindow: { useWebsiteTheme: false, iconColor: '#cccccc' },
        }),
      });
      window.fetch = mockFetch;
      globalThis.fetch = mockFetch;
      await initStore();
      expect(bubbleStore.get().outlineRing?.color).toBe('#bbbbbb');
      expect(greetWindowStore.get().iconColor).toBe('#cccccc');

      // Config 5: no root accentColor (983 & 1002 else-if false sides) with chatbar bgColor present
      mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          greetWindow: { useWebsiteTheme: false, iconColor: '#cccccc' },
          chatbar: { useWebsiteTheme: false, bgColor: '#00ff00' },
        }),
      });
      window.fetch = mockFetch;
      globalThis.fetch = mockFetch;
      await initStore();
      expect(greetWindowStore.get().iconColor).toBe('#cccccc');
      expect(chatbarStore.get().bgColor).toBe('#00ff00');
    });
  });
});
