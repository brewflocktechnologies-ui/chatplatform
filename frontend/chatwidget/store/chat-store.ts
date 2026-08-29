import {
  getParentTheme,
  isHostDark,
  observeDarkMode
} from '../utils/theme.js';
import { getClientId, fetchClientConfig } from '../utils/config.js';
import { sanitizeConfig } from '../tokens/merge.js';
import { CHATBAR_BAR_PRESET, CHATBAR_CARD_PRESET } from '../config/chatbar-presets.js';

// Types live in ./types.js (pure, side-effect-free) so presentational
// components can depend on them without coupling to the store singleton.
import type {
  Message,
  ChatState,
  ChatWindowState,
  FeaturesState,
  BubbleState,
  GreetWindowState,
  ChatbarState,
  FullStore,
  InputBoxConfig,
  WelcomeConfig
} from './types.js';

export type {
  Message,
  ConfirmBoxConfig,
  ChatState,
  WelcomeConfig,
  ChatWindowState,
  FeaturesState,
  BadgeConfig,
  BubbleState,
  InputBoxConfig,
  GreetWindowState,
  ChatbarState,
  FullStore
} from './types.js';

// ---------------------------------------------------------------------------
// Store Singleton & Event Emitter
// ---------------------------------------------------------------------------

const emitter = new EventTarget();

function emit(event: string) {
  emitter.dispatchEvent(new CustomEvent(event));
}


function buildDefaultBubble(theme: { primary: string; secondary: string }): BubbleState {
  return {
    useWebsiteTheme: true,
    position: 'bottom-right',
    offsetLeft: 16,
    offsetRight: 16,
    offsetBottom: 12,
    width: 60,
    height: 60,
    borderRadius: { tl: 50, tr: 50, bl: 50, br: 50 },
    backgroundColor: theme.primary,
    gradientType: 'none',
    gradientStops: [
      { color: theme.primary, pos: 0 },
      { color: theme.secondary, pos: 100 },
    ],
    backgroundOverlayType: 'image',
    backgroundImageUrl: '',
    backgroundImageSize: 'contain',
    backgroundImageOpacity: 0.25,
    backgroundBlendMode: 'normal',
    border: { width: 0, color: theme.primary, style: 'solid' },
    outlineRing: { enabled: true, width: 3, color: theme.secondary, opacity: 0.4 },
    boxShadowBlur: 20,
    boxShadowSpread: 0,
    boxShadowOffsetX: 0,
    boxShadowOffsetY: 8,
    boxShadowOpacity: 0.25,
    dots: { color: '#F8FAFC', size: 6, spacing: 6, animation: 'bounce' },
    hideOnOpen: true,
    tooltip: {
      enabled: false,
      text: 'Chat with us',
      position: '',
      backgroundColor: '#ffffff',
      textColor: '#374151',
      fontSize: 14,
      borderRadius: { tl: 20, tr: 20, br: 4, bl: 20 },
      padding: '8px 16px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      arrowEnabled: true,
      borderColor: 'transparent',
      borderWidth: 0,
    },
    badge: {
      position: 'top-right',
      offsetX: -6,
      offsetY: -6,
      size: 20,
      backgroundColor: '#dc2626',
      textColor: '#ffffff',
      fontSize: 11,
      borderWidth: 2,
      borderColor: '#ffffff',
      borderRadius: '9999px',
      fontWeight: '700',
      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      padding: '0px',
      animation: 'pulse 1.5s infinite',
    },
  };
}

function buildDefaultGreetWindow(theme: { primary: string; secondary: string }): GreetWindowState {
  return {
    enabled: false,
    dismissed: false,
    useWebsiteTheme: false,
    width: 320,
    spacing: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: '24px 20px',
    boxShadow: '0 12px 28px -6px rgba(0,0,0,0.15), 0 8px 14px -4px rgba(0,0,0,0.1)',
    imageUrl: '',
    imageHeight: 70,
    imageWidth: '',
    iconAlign: 'center',
    imagePadding: '0px',
    iconType: 'lucide',
    lucideIcon: 'Sparkles',
    iconSize: 52,
    iconColor: theme.primary,
    iconAnimation: 'wiggle',
    iconAnimationDuration: '2.5s',
    title: 'Hi there! 👋 Need help growing your business using AI?',
    titleColor: '#1e293b',
    titleFontSize: '15px',
    description: "Let's chat & find the right solution for you!",
    descriptionColor: '#475569',
    descriptionFontSize: '14px',
    openingTimeAfterInitialLoadSec: 2,
    animationOpeningSec: 0.5,
    animationClosingSec: 0.3,
    visible: false,
    inputBox: {
      enabled: true,
      layout: 'separated',
      placeholder: 'Write your message...',
      backgroundColor: '#ffffff',
      textColor: '#1e293b',
      borderRadius: 24,
      boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
      buttonColor: theme.primary,
      buttonIconColor: '#ffffff',
      openingTimeAfterInitialLoadSec: 4,
      animationOpeningSec: 0.5,
      visible: false,
    },
  };
}

function buildDefaultChatWindow(theme: { primary: string; secondary: string }): ChatWindowState {
  return {
    useWebsiteTheme: true,
    offsetRight: null,
    offsetBottom: null,
    animationOpeningSec: 0.3,
    animationClosingSec: 0.2,
    clientName: 'Zotly Support',
    agentName: 'Sarah',
    accentColor: theme.primary,
    widgetWidth: 400,
    widgetHeight: 650,
    expandedWidth: 550,
    widgetBorderRadius: 28,
    widgetShadow: true,
    widgetShadowBlur: 20,
    widgetShadowColor: 'rgba(0,0,0,0.15)',
    widgetBorderEnabled: true,
    widgetBorderWidth: 1,
    widgetBorderColor: '#e5e7eb',
    modernUi: true,
    typingIndicator: true,
    attachmentsEnabled: true,
    ticksEnabled: true,
    readTickColor: '#34b7f1',
    headerBg: theme.primary,
    headerTextColor: '#ffffff',
    headerBorderColor: 'rgba(0,0,0,0.08)',
    headerPadding: '14px 16px',
    headerTitleFontSize: '14px',
    headerSubtitleFontSize: '11px',
    headerAvatarBg: 'rgba(255,255,255,0.2)',
    headerAvatarColor: '#ffffff',
    activeDot: {
      color: '#22c55e',
      animate: true,
      borderWidth: 0,
      borderColor: 'transparent',
      size: 8,
    },
    endChatConfirmMessage: 'Are you sure you want to end this chat session?',
    endChatConfirmLabel: 'End chat',
    endChatCancelLabel: 'Cancel',
    modalCardBg: '#ffffff',
    modalMessageColor: '#101828',
    modalBorderRadius: 28,
    endChatConfirmBg: theme.primary,
    endChatConfirmTextColor: '#ffffff',
    endChatCancelBg: '#ffffff',
    endChatCancelTextColor: '#667085',
    endChatCancelBorderColor: '#e9ecf1',
    bodyBg: '#f4f4f5',
    visitorBubbleBg: theme.primary,
    visitorBubbleColor: '#ffffff',
    visitorBubbleFontSize: '14px',
    visitorBubblePadding: '10px 14px',
    visitorBubbleBorderRadius: '16px',
    agentBubbleBg: '#ffffff',
    agentBubbleColor: '#111827',
    agentBubbleBorderColor: '#d1d5db',
    agentBubbleFontSize: '14px',
    agentBubblePadding: '10px 14px',
    agentBubbleBorderRadius: '16px',
    agentAvatarBg: theme.primary,
    agentAvatarColor: '#ffffff',
    inputBg: '#ffffff',
    inputTextColor: '#18181b',
    inputPlaceholderColor: '#6b7280',
    inputBorderColor: '#d1d5db',
    inputFocusBorderColor: theme.primary,
    inputFocusShadow: `0 0 0 3px ${theme.primary}26`,
    inputBorderRadius: '9999px',
    inputPadding: '6px 8px',
    inputMargin: '12px 16px',
    textareaFontSize: '14px',
    attachButtonBg: '#ffffff',
    attachButtonColor: '#6b7280',
    emojiButtonColor: '#6b7280',
    sendButtonBgActive: theme.primary,
    sendButtonColorActive: '#ffffff',
    sendButtonBgInactive: '#e5e7eb',
    sendButtonColorInactive: '#9ca3af',
    sendIconType: 'arrow',
    footerBg: '#f9fafb',
    footerTextColor: '#6b7280',
    footerFontSize: '12px',
    footerPaddingBottom: '16px',
    poweredByText: 'vAInatheya.ai',
    poweredByLink: '#',
    poweredByColor: theme.primary,
    welcome: {
      enabled: false,
      useWebsiteTheme: true,
      cardLayout: 'glassy',
      cardAlign: 'center',
      textAlign: 'center',
      logoAlign: 'center',
      avatarAlign: 'center',
      cardBg: 'rgba(255, 255, 255, 0.12)',
      cardBorder: '1px solid rgba(255, 255, 255, 0.22)',
      cardBorderRadius: 24,
      cardPadding: '28px 24px',
      cardBlur: 16,
      cardShadow: '0 12px 40px 0 rgba(0, 0, 0, 0.15)',
      title: 'Hi there! 👋 How can we help you today?',
      titleFontSize: '26px',
      description: 'Our support heroes are here to assist you.',
      descriptionFontSize: '15px',
      bgGradient: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
      headerTextColor: '#ffffff',
      subtextColor: 'rgba(255, 255, 255, 0.85)',
      padding: '32px 20px 10px 20px',
      footerPaddingBottom: '0px',
      avatarBorderColor: 'rgba(255, 255, 255, 0.2)',
      avatars: [
        { name: 'Sarah', bg: '#059669', color: '#ffffff' },
        { name: 'Alex', bg: '#0284c7', color: '#ffffff' },
        { name: 'Emily', bg: '#7c3aed', color: '#ffffff' }
      ],
      buttonText: 'Start Conversation',
      buttonBg: '#ffffff',
      buttonTextColor: '#111827',
      buttonIconColor: theme.primary,
    },
  };
}

function buildDefaultFeatures(): FeaturesState {
  return {
    voiceCallEnabled: false,
    videoCallEnabled: false,
    voiceCallMaster: false,
    voiceCallAgents: false,
    voiceCallVisitors: false,
    videoCallMaster: false,
    videoCallAgents: false,
    videoCallVisitors: false,
    disableVisitorCamera: false,
    closeChatVisitor: true,
    averageQueueTime: 1,
    chatAcceptanceTime: 5,
    prechatEnabled: false,
    postchatEnabled: false,
  };
}

function buildDefaultChatbar(theme: { primary: string; secondary: string }): ChatbarState {
  return {
    enabled: false,
    useWebsiteTheme: true,
    position: 'bottom-right',
    offsetLeft: 16,
    offsetRight: 16,
    offsetBottom: 12,
    cardOffsetRight: null,
    cardOffsetBottom: null,
    barOffsetRight: null,
    barOffsetBottom: null,
    text: 'Chat with us',
    cardText: '',
    barText: 'Chat with us',
    bgColor: theme.primary,
    textColor: '#ffffff',
    textSize: 14,
    letterSpacing: 0,
    gradientEnabled: false,
    gradientStops: [
      { color: theme.primary, pos: 0 },
      { color: theme.secondary, pos: 100 },
    ],
    gradientType: 'linear',
    gradientAngle: 90,
    iconType: 'lucide',
    iconColor: '#ffffff',
    lucideIcon: 'MessageCircle',
    iconImageUrl: '',
    iconFit: 'contain',
    iconOpacity: 1,
    iconBlend: 'normal',
    iconWidth: 20,
    iconHeight: 20,
    width: 255,
    height: 44,
    shadow: true,
    borderRadius: { tl: 20, tr: 20, bl: 20, br: 20 },
    hideOnOpen: true,
  };
}

function buildDefaultChat(): ChatState {
  return {
    state: 'active',
    isExpanded: false,
    panelOpen: false,
    unreadCount: 0,
    isMobile: window.innerWidth < 640 || window.innerHeight < 750,
    clientName: 'Zotly Support',
    agentName: 'Sarah',
    agentsOnline: true,
    token: 'visitor-token-demo',
    position: 1,
    menuOpen: false,
    attachOpen: false,
    emojiOpen: false,
    confirmBox: null,
    reconnecting: false,
    soundsOn: true,
    consentDismissed: false,
    draft: '',
    uploading: false,
    typingName: '',
    offlineName: '',
    offlineEmail: '',
    offlineMessage: '',
    offlineSending: false,
    hasSentMessage: false,
    lastFeedback: undefined,
    flags: {},
    messages: [
      {
        key: 'msg_welcome',
        senderType: 'AGENT',
        senderName: 'Sarah',
        body: 'Welcome! How can we assist you today?',
        created: new Date().toISOString(),
      },
    ],
  };
}

let store: FullStore | null = null;
let storeReady = false;
let lastOverrides: Record<string, unknown> = {};

// Callers (host pages, tests) that inject/update store config right after
// mounting can otherwise race `initStore()`'s async client-config fetch: the
// widget attaches to the DOM synchronously, but `connectedCallback` awaits
// `initStore()`, so a caller reading store state immediately after "attached"
// may observe defaults/presets instead of its own queued overrides.
// `whenStoreReady()` gives them a deterministic point to await instead of
// guessing timing.
let storeReadyResolve: (() => void) | null = null;
let storeReadyPromise: Promise<void> = new Promise((resolve) => {
  storeReadyResolve = resolve;
});

let hasInjectedCustomConfig = false;
let activeInjectedChatWindowConfig: Record<string, any> = {};

/**
 * Resolves once the store has finished initializing — including the fetched
 * client config and any overrides queued via updateStoreConfig/injectStoreConfig
 * before init completed. Safe to call before, during, or after initStore();
 * resolves immediately if the store is already ready.
 */
export function whenStoreReady(): Promise<void> {
  return storeReadyPromise;
}

function getStore(): FullStore {
  if (!store) {
    const theme = getParentTheme();
    store = {
      bubble: buildDefaultBubble(theme),
      greetWindow: buildDefaultGreetWindow(theme),
      chatWindow: buildDefaultChatWindow(theme),
      features: buildDefaultFeatures(),
      chat: buildDefaultChat(),
      chatbar: buildDefaultChatbar(theme),
    };
  }
  return store;
}

export function subscribe(event: string, callback: () => void): () => void {
  emitter.addEventListener(event, callback);
  return () => emitter.removeEventListener(event, callback);
}

export function subscribeAll(callback: () => void): () => void {
  const events = ['store:bubble', 'store:greetWindow', 'store:chatWindow', 'store:chat', 'store:chatbar', 'store:features'];
  const removers = events.map((e) => subscribe(e, callback));
  return () => removers.forEach((r) => r());
}

// Convenience property accessors (read-only refs to the live object)
export const bubbleStore = { get(): BubbleState { return getStore().bubble; } };
export const greetWindowStore = { get(): GreetWindowState { return getStore().greetWindow; } };
export const chatWindowStore = { get(): ChatWindowState { return getStore().chatWindow; } };
export const featuresStore = { get(): FeaturesState { return getStore().features; } };
export const chatbarStore = { get(): ChatbarState { return getStore().chatbar; } };
export const chatStore = {
  get(): ChatState { return getStore().chat; },

  flag(key: string, defaultValue = true): boolean {
    const s = getStore().chat;
    return s.flags[key] !== undefined ? s.flags[key] : defaultValue;
  },

  send(textOverride?: string) {
    const s = getStore().chat;
    const text = (textOverride || s.draft || '').trim();
    if (!text) return;
    const msgObj: Message = {
      key: 'msg_' + Date.now(),
      senderType: 'VISITOR',
      body: text,
      created: new Date().toISOString(),
      status: 'sent',
    };
    s.messages = [...s.messages, msgObj];
    s.draft = '';
    s.emojiOpen = false;
    s.attachOpen = false;
    s.hasSentMessage = true;
    emit('store:chat');

    // Dismiss greet window
    const gw = getStore().greetWindow;
    /* v8 ignore next -- getStore() always constructs a greetWindow, so this guard never short-circuits */
    if (gw) {
      gw.dismissed = true;
      gw.visible = false;
      if (gw.inputBox) gw.inputBox = { ...gw.inputBox, visible: false };
      emit('store:greetWindow');
    }

    // Reset chatbar from card to bar layout if needed
    chatStore.resetChatbarLayout();

    // Simulate delivery and read status
    setTimeout(() => {
      const idx = s.messages.findIndex((m) => m.key === msgObj.key);
      if (idx !== -1) {
        s.messages = s.messages.map((m, i) =>
          i === idx ? { ...m, status: 'delivered' } : m
        );
        emit('store:chat');
      }
    }, 1500);
    setTimeout(() => {
      const curState = getStore().chat;
      curState.typingName = curState.agentName || 'Sarah';
      const idx = curState.messages.findIndex((m) => m.key === msgObj.key);
      if (idx !== -1) {
        curState.messages = curState.messages.map((m, i) =>
          i === idx ? { ...m, status: 'read' } : m
        );
      }
      emit('store:chat');
    }, 2800);
    setTimeout(() => {
      const curState = getStore().chat;
      curState.typingName = '';
      const botMsg: Message = {
        key: 'bot_' + Date.now(),
        senderType: 'AGENT',
        senderName: curState.agentName || 'Sarah',
        body: 'Our team will contact you soon!',
        created: new Date().toISOString(),
      };
      curState.messages = [...curState.messages, botMsg];
      if (!curState.panelOpen) {
        curState.unreadCount = (curState.unreadCount || 0) + 1;
      }
      emit('store:chat');
    }, 4500);
  },

  resetChatbarLayout() {
    const cb = getStore().chatbar;
    if (cb.enabled && cb.layout === 'card') {
      cb.layout = 'bar';
      cb.height = 40;
      cb.width = 255;
      cb.offsetRight =
        cb.barOffsetRight !== undefined && cb.barOffsetRight !== null ? cb.barOffsetRight : 16;
      cb.offsetBottom =
        cb.barOffsetBottom !== undefined && cb.barOffsetBottom !== null ? cb.barOffsetBottom : 12;
      emit('store:chatbar');
    }
  },

  askEndChat() {
    const s = getStore().chat;
    const cw = getStore().chatWindow;
    s.confirmBox = {
      message: cw.endChatConfirmMessage || 'Are you sure you want to end this chat session?',
      confirmLabel: cw.endChatConfirmLabel || 'End chat',
      cancelLabel: cw.endChatCancelLabel || 'Cancel',
    };
    emit('store:chat');
  },

  confirmEnd(overridePostchatEnabled?: boolean) {
    const s = getStore().chat;
    const fs = getStore().features;
    const isPostchatEnabled = overridePostchatEnabled !== undefined ? overridePostchatEnabled : (fs.postchatEnabled ?? false);
    s.state = isPostchatEnabled ? 'postchat' : 'closed';
    s.confirmBox = null;
    emit('store:chat');
  },

  startNew() {
    const s = getStore().chat;
    s.state = 'active';
    s.messages = [
      {
        key: 'm_new',
        senderType: 'AGENT',
        senderName: s.agentName || 'Sarah',
        body: 'Chat restarted. How can we help you?',
        created: new Date().toISOString(),
      },
    ];
    emit('store:chat');
  },

  startFromWelcome(overridePrechatEnabled?: boolean) {
    const s = getStore().chat;
    const fs = getStore().features;
    const isPrechatEnabled = overridePrechatEnabled !== undefined ? overridePrechatEnabled : (fs.prechatEnabled ?? false);
    s.panelOpen = true;
    s.state = isPrechatEnabled ? 'prechat' : 'active';
    emit('store:chat');
  },

  closePanel() {
    const s = getStore().chat;
    s.isExpanded = false;
    s.menuOpen = false;
    s.attachOpen = false;
    s.emojiOpen = false;
    s.panelOpen = false;
    emit('store:chat');
    window.dispatchEvent(new CustomEvent('close-contact-widget'));
  },

  toggleExpand() {
    const s = getStore().chat;
    s.isExpanded = !s.isExpanded;
    emit('store:chat');
  },

  toggleMenu() {
    const s = getStore().chat;
    s.menuOpen = !s.menuOpen;
    s.attachOpen = false;
    s.emojiOpen = false;
    emit('store:chat');
  },

  closePopups() {
    const s = getStore().chat;
    if (s.menuOpen || s.attachOpen || s.emojiOpen) {
      s.menuOpen = false;
      s.attachOpen = false;
      s.emojiOpen = false;
      emit('store:chat');
    }
  },


  toggleAttach() {
    const s = getStore().chat;
    s.attachOpen = !s.attachOpen;
    s.emojiOpen = false;
    emit('store:chat');
  },

  toggleEmoji() {
    const s = getStore().chat;
    s.emojiOpen = !s.emojiOpen;
    s.attachOpen = false;
    emit('store:chat');
  },

  insertEmoji(emoji: string) {
    const s = getStore().chat;
    s.draft = (s.draft || '') + emoji;
    emit('store:chat');
  },

  cancelEndChat() {
    getStore().chat.confirmBox = null;
    emit('store:chat');
  },

  dismissGreetWindow() {
    const gw = getStore().greetWindow;
    gw.dismissed = true;
    gw.visible = false;
    if (gw.inputBox) gw.inputBox = { ...gw.inputBox, visible: false };
    emit('store:greetWindow');
  },

  downloadTranscript() {
    const s = getStore().chat;
    s.menuOpen = false;
    emit('store:chat');

    // Build a plain-text transcript from the current message list.
    const lines: string[] = [
      `Chat Transcript — ${s.clientName || 'Support'}`,
      `Agent: ${s.agentName || 'Agent'}`,
      `Downloaded: ${new Date().toLocaleString()}`,
      '─'.repeat(48),
      '',
    ];

    for (const msg of s.messages || []) {
      const sender = msg.senderType === 'VISITOR' ? 'You' : (msg.senderName || s.agentName || 'Agent');
      const time = msg.created
        ? new Date(msg.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';
      if (msg.attachment) {
        lines.push(`[${time}] ${sender}: [Image attachment]`);
      } else if (msg.body) {
        lines.push(`[${time}] ${sender}: ${msg.body}`);
      }
    }

    const text = lines.join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `chat-transcript-${Date.now()}.txt`;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    // Revoke the object URL after the browser has had time to initiate the download.
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(anchor);
    }, 100);
  },

  toggleSounds() {
    const s = getStore().chat;
    s.soundsOn = !s.soundsOn;
    emit('store:chat');
  },

  dismissConsent() {
    getStore().chat.consentDismissed = true;
    emit('store:chat');
  },

  submitPrechat(values: Record<string, string>) {
    const s = getStore().chat;
    if (values.name) s.offlineName = values.name;
    if (values.email) s.offlineEmail = values.email;
    s.panelOpen = true;
    s.hasSentMessage = true;
    s.state = 'active';
    emit('store:chat');
  },

  submitPostchat(values: Record<string, string>) {
    const s = getStore().chat;
    const cws = getStore().chatWindow;
    s.lastFeedback = { ...(values || {}) };
    s.panelOpen = false;
    s.isExpanded = false;
    s.menuOpen = false;
    s.attachOpen = false;
    s.emojiOpen = false;
    s.confirmBox = null;
    const welcomeEnabled = cws?.welcome?.enabled !== false;
    s.state = welcomeEnabled ? 'welcome' : 'active';
    emit('store:chat');
    window.dispatchEvent(new CustomEvent('postchat-feedback', { detail: s.lastFeedback }));
    window.dispatchEvent(new CustomEvent('close-contact-widget'));
  },

  submitOfflinePayload(values: Record<string, string>) {
    const s = getStore().chat;
    if (values.name) s.offlineName = values.name;
    if (values.email) s.offlineEmail = values.email;
    if (values.message) s.offlineMessage = values.message;
    s.offlineSending = true;
    emit('store:chat');
    setTimeout(() => {
      s.offlineSending = false;
      s.state = 'offline-sent';
      emit('store:chat');
    }, 800);
  },

  submitOffline() {
    const s = getStore().chat;
    if (s.offlineEmail && s.offlineMessage) {
      s.offlineSending = true;
      emit('store:chat');
      setTimeout(() => {
        s.offlineSending = false;
        s.state = 'offline-sent';
        emit('store:chat');
      }, 1000);
    }
  },

  uploadImage(input: HTMLInputElement) {
    const s = getStore().chat;
    if (input.files && input.files[0]) {
      const url = URL.createObjectURL(input.files[0]);
      const msgObj: Message = {
        key: 'img_' + Date.now(),
        senderType: 'VISITOR',
        localUrl: url,
        attachment: true,
        body: '',
        created: new Date().toISOString(),
        status: 'sent',
      };
      s.messages = [...s.messages, msgObj];
      s.attachOpen = false;
      s.hasSentMessage = true;
      emit('store:chat');
      chatStore.resetChatbarLayout();
      setTimeout(() => {
        const idx = s.messages.findIndex((m) => m.key === msgObj.key);
        if (idx !== -1) {
          s.messages = s.messages.map((m, i) => (i === idx ? { ...m, status: 'delivered' } : m));
          emit('store:chat');
        }
      }, 2000);
      setTimeout(() => {
        const idx = s.messages.findIndex((m) => m.key === msgObj.key);
        if (idx !== -1) {
          s.messages = s.messages.map((m, i) => (i === idx ? { ...m, status: 'read' } : m));
          emit('store:chat');
        }
      }, 4000);
      setTimeout(() => {
        const curState = getStore().chat;
        const botMsg: Message = {
          key: 'bot_' + Date.now(),
          senderType: 'AGENT',
          senderName: curState.agentName || 'Sarah',
          body: 'Our team will contact you soon!',
          created: new Date().toISOString(),
        };
        curState.messages = [...curState.messages, botMsg];
        if (!curState.panelOpen) {
          curState.unreadCount = (curState.unreadCount || 0) + 1;
        }
        emit('store:chat');
      }, 5000);
    }
  },

  /**
   * Adds a cropped image (base64 data URL from cw-image-cropper) as a
   * proper attachment message. Uses the data URL directly as `localUrl` so
   * the bubble renders the real image instead of a stub string.
   */
  sendCroppedImage(dataUrl: string) {
    if (!dataUrl || !dataUrl.startsWith('data:')) return;
    const s = getStore().chat;
    const msgObj: Message = {
      key: 'img_cropped_' + Date.now(),
      senderType: 'VISITOR',
      localUrl: dataUrl,
      attachment: true,
      body: '',
      created: new Date().toISOString(),
      status: 'sent',
    };
    s.messages = [...s.messages, msgObj];
    s.attachOpen = false;
    s.hasSentMessage = true;
    emit('store:chat');
    chatStore.resetChatbarLayout();
    // Simulate delivery → read → bot reply (same cadence as uploadImage)
    setTimeout(() => {
      const idx = s.messages.findIndex((m) => m.key === msgObj.key);
      if (idx !== -1) {
        s.messages = s.messages.map((m, i) => (i === idx ? { ...m, status: 'delivered' } : m));
        emit('store:chat');
      }
    }, 2000);
    setTimeout(() => {
      const idx = s.messages.findIndex((m) => m.key === msgObj.key);
      if (idx !== -1) {
        s.messages = s.messages.map((m, i) => (i === idx ? { ...m, status: 'read' } : m));
        emit('store:chat');
      }
    }, 4000);
    setTimeout(() => {
      const curState = getStore().chat;
      const botMsg: Message = {
        key: 'bot_' + Date.now(),
        senderType: 'AGENT',
        senderName: curState.agentName || 'Sarah',
        body: 'Got your image! Our team will review it shortly.',
        created: new Date().toISOString(),
      };
      curState.messages = [...curState.messages, botMsg];
      if (!curState.panelOpen) {
        curState.unreadCount = (curState.unreadCount || 0) + 1;
      }
      emit('store:chat');
    }, 5000);
  },

  captureScreenshot() {
    getStore().chat.attachOpen = false;
    emit('store:chat');
    // Screenshot capture requires access to the full page DOM outside the
    // widget's shadow root. Dispatch a window-level event so the host page
    // (or an integration layer using html2canvas / puppeteer) can handle it.
    window.dispatchEvent(new CustomEvent('cw:capture-screenshot-request', {
      detail: { timestamp: new Date().toISOString() },
      bubbles: false,
    }));
  },

  dividerBefore(index: number): boolean {
    return index === 0;
  },

  dayLabel(): string {
    return 'Today';
  },

  timeLabel(msg: Message): string {
    const d = msg.created ? new Date(msg.created) : new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  },

  groupStart(index: number): boolean {
    const s = getStore().chat;
    return index === 0 || s.messages[index].senderType !== s.messages[index - 1].senderType;
  },

  groupEnd(index: number): boolean {
    const s = getStore().chat;
    return (
      index === s.messages.length - 1 ||
      s.messages[index].senderType !== s.messages[index + 1].senderType
    );
  },

  attachmentUrl(msg: Message): string {
    return msg.localUrl || msg.url || '';
  },
};

// ---------------------------------------------------------------------------
// Store Initializer (async, fetches remote config safely)
// ---------------------------------------------------------------------------

export async function initStore(): Promise<void> {
  storeReady = false;
  storeReadyPromise = new Promise((resolve) => {
    storeReadyResolve = resolve;
  });
  lastOverrides = {};
  const theme = getParentTheme();
  const clientId = getClientId();

  store = {
    bubble: buildDefaultBubble(theme),
    greetWindow: buildDefaultGreetWindow(theme),
    chatWindow: buildDefaultChatWindow(theme),
    features: buildDefaultFeatures(),
    chat: buildDefaultChat(),
    chatbar: buildDefaultChatbar(theme),
  };

  // Emit initial state
  emit('store:bubble');
  emit('store:greetWindow');
  emit('store:chatWindow');
  emit('store:features');
  emit('store:chat');
  emit('store:chatbar');

  try {
    const rawConfig = await fetchClientConfig(clientId);

    // Untrusted remote config: strip CSS-injection payloads before merging.
    let { accentColor: rootAccentColor, bubbleConfig, chatConfig, chatbarConfig, greetWindowConfig, featuresConfig } = rawConfig;
    bubbleConfig = sanitizeConfig(bubbleConfig).value;
    greetWindowConfig = sanitizeConfig(greetWindowConfig).value;
    chatbarConfig = sanitizeConfig(chatbarConfig).value;
    chatConfig = sanitizeConfig(chatConfig).value;
    featuresConfig = sanitizeConfig(featuresConfig).value;

    // Apply bubble config
    if (bubbleConfig && Object.keys(bubbleConfig).length > 0) {
      const bc = bubbleConfig as Partial<BubbleState>;
      if (bc.useWebsiteTheme) {
        bc.backgroundColor = theme.primary;
        bc.gradientType = 'none';
        if (bc.outlineRing) bc.outlineRing.color = theme.secondary;
      } else if (rootAccentColor && !bc.backgroundColor) {
        bc.backgroundColor = rootAccentColor;
        if (bc.outlineRing && !bc.outlineRing.color) bc.outlineRing.color = rootAccentColor;
      }
      Object.assign(store.bubble, bc);
      if (bc.position) store.greetWindow.position = bc.position;
      emit('store:bubble');
      emit('store:greetWindow');
    }

    // Apply greet window config
    if (greetWindowConfig && Object.keys(greetWindowConfig).length > 0) {
      const gwc = greetWindowConfig as Partial<GreetWindowState>;
      if (gwc.inputBox) {
        gwc.inputBox = { ...store.greetWindow.inputBox, ...gwc.inputBox };
      }
      if (gwc.useWebsiteTheme) {
        gwc.iconColor = theme.primary;
        if (gwc.inputBox) {
          if (gwc.inputBox.layout === 'separated') {
            gwc.inputBox.buttonIconColor = theme.primary;
          } else {
            gwc.inputBox.buttonColor = theme.primary;
          }
        }
      } else if (rootAccentColor) {
        if (!gwc.iconColor) gwc.iconColor = rootAccentColor;
        if (gwc.inputBox) {
          if (gwc.inputBox.layout === 'separated') {
            if (!gwc.inputBox.buttonIconColor) gwc.inputBox.buttonIconColor = rootAccentColor;
          } else if (!gwc.inputBox.buttonColor) {
            gwc.inputBox.buttonColor = rootAccentColor;
          }
        }
      }
      Object.assign(store.greetWindow, gwc);
      emit('store:greetWindow');
    }

    // Apply chatbar config
    if (chatbarConfig && Object.keys(chatbarConfig).length > 0) {
      const cbc = chatbarConfig as Partial<ChatbarState>;
      if (cbc.useWebsiteTheme) {
        cbc.bgColor = theme.primary;
      } else if (rootAccentColor && !cbc.bgColor) {
        cbc.bgColor = rootAccentColor;
      }
      Object.assign(store.chatbar, cbc);
      const cb = store.chatbar;
      if (cb.layout === 'card') {
        if (cb.cardOffsetRight !== undefined && cb.cardOffsetRight !== null) cb.offsetRight = cb.cardOffsetRight;
        if (cb.cardOffsetBottom !== undefined && cb.cardOffsetBottom !== null) cb.offsetBottom = cb.cardOffsetBottom;
      } else {
        if (cb.barOffsetRight !== undefined && cb.barOffsetRight !== null) cb.offsetRight = cb.barOffsetRight;
        if (cb.barOffsetBottom !== undefined && cb.barOffsetBottom !== null) cb.offsetBottom = cb.barOffsetBottom;
      }
      emit('store:chatbar');
    }

    // Apply chat config (with theme support + dark mode reactivity)
    if (chatConfig && Object.keys(chatConfig).length > 0) {
      const cc = chatConfig as Record<string, any>;
      if (cc.welcome) {
        store.chatWindow.welcome = { ...store.chatWindow.welcome, ...cc.welcome };
      }

      function applyTheme() {
        const isDark = isHostDark();
        const effectiveChatConfig = {
          ...(store?.chatWindow || {}),
          ...cc,
          ...activeInjectedChatWindowConfig,
        };
        const active = JSON.parse(JSON.stringify(effectiveChatConfig)) as Record<string, any>;

        const useWebTheme = cc.useWebsiteTheme ?? (rootAccentColor ? false : active.useWebsiteTheme);

        if (useWebTheme && !hasInjectedCustomConfig) {
          active.accentColor = active.accentColor || theme.primary;
          active.visitorBubbleBg = active.visitorBubbleBg || theme.primary;
          active.visitorBubbleColor = active.visitorBubbleColor || '#ffffff';
          active.headerBg = active.headerBg || theme.primary;
          active.headerTextColor = active.headerTextColor || '#ffffff';
          active.headerAvatarBg = active.headerAvatarBg || 'rgba(255,255,255,0.2)';
          active.headerAvatarColor = active.headerAvatarColor || '#ffffff';
          active.agentAvatarBg = active.agentAvatarBg || theme.primary;
          active.agentAvatarColor = active.agentAvatarColor || '#ffffff';
          active.inputFocusBorderColor = active.inputFocusBorderColor || theme.primary;
          active.inputFocusShadow = active.inputFocusShadow || `0 0 0 2px ${theme.primary}26`;
          active.sendButtonBgActive = active.sendButtonBgActive || theme.primary;
          active.poweredByColor = active.poweredByColor || theme.primary;
          active.endChatConfirmBg = active.endChatConfirmBg || theme.primary;
          active.endChatConfirmTextColor = active.endChatConfirmTextColor || '#ffffff';

          if (isDark) {
            active.bodyBg = 'var(--cw-bg)';
            active.inputBg = 'var(--cw-surface)';
            active.agentBubbleBg = 'var(--cw-surface)';
            active.agentBubbleColor = 'var(--cw-ink)';
            active.agentBubbleBorderColor = 'var(--cw-border)';
            active.footerBg = 'var(--cw-bg)';
            active.footerTextColor = 'var(--cw-muted)';
            active.inputTextColor = 'var(--cw-ink)';
            active.inputBorderColor = 'var(--cw-border)';
            active.attachButtonBg = 'var(--cw-surface)';
            active.attachButtonColor = 'var(--cw-muted)';
            active.emojiButtonColor = 'var(--cw-muted)';
            active.modalCardBg = 'var(--cw-surface)';
            active.modalMessageColor = 'var(--cw-ink)';
            active.endChatCancelBg = 'var(--cw-surface)';
            active.endChatCancelTextColor = 'var(--cw-muted)';
            active.endChatCancelBorderColor = 'var(--cw-border)';
          }
        } else if (rootAccentColor) {
          if (!cc.accentColor) active.accentColor = rootAccentColor;
          if (!cc.visitorBubbleBg) active.visitorBubbleBg = rootAccentColor;
          if (!cc.headerBg) active.headerBg = rootAccentColor;
          if (!cc.agentAvatarBg) active.agentAvatarBg = rootAccentColor;
          if (!cc.inputFocusBorderColor) active.inputFocusBorderColor = rootAccentColor;
          if (!cc.inputFocusShadow) active.inputFocusShadow = `0 0 0 2px ${rootAccentColor}26`;
          if (!cc.sendButtonBgActive) active.sendButtonBgActive = rootAccentColor;
          if (!cc.poweredByColor) active.poweredByColor = rootAccentColor;
          if (!cc.endChatConfirmBg) active.endChatConfirmBg = rootAccentColor;
        }

        const welcomeObj = active.welcome || store!.chatWindow.welcome;
        if (welcomeObj) {
          const welcomeUseTheme = welcomeObj.useWebsiteTheme ?? (useWebTheme && !hasInjectedCustomConfig);
          if (welcomeUseTheme && !welcomeObj.bgGradient) {
            const sec = theme.secondary && theme.secondary !== theme.primary ? theme.secondary : theme.primary;
            welcomeObj.bgGradient = `linear-gradient(135deg, ${theme.primary}, ${sec})`;
            welcomeObj.buttonIconColor = welcomeObj.buttonIconColor || theme.primary;
            active.welcome = welcomeObj;
          } else if (rootAccentColor && !welcomeObj.bgGradient) {
            welcomeObj.bgGradient = `linear-gradient(135deg, ${rootAccentColor}, ${rootAccentColor})`;
            if (!welcomeObj.buttonIconColor) welcomeObj.buttonIconColor = rootAccentColor;
            active.welcome = welcomeObj;
          }
        }

        if (isDark && cc.dark && Object.keys(cc.dark).length > 0) {
          Object.assign(active, cc.dark);
        }

        Object.assign(store!.chatWindow, active);
        emit('store:chatWindow');
      }

      applyTheme();
      observeDarkMode(() => applyTheme());

      // Sync chat agent/client names
      if (cc.clientName) store.chat.clientName = cc.clientName;
      if (cc.agentName) {
        store.chat.agentName = cc.agentName;
        /* v8 ignore next -- initStore always seeds a welcome message, so messages[0] is never empty here */
        if (store.chat.messages[0]) store.chat.messages[0].senderName = cc.agentName;
      }
      const rawAny = rawConfig as any;
      if (Array.isArray(rawAny.messages) && rawAny.messages.length > 0) {
        const activeKey = (typeof window !== 'undefined' && (window as any).activeMessagePreviewKey) || 'welcome';
        const welcomeItem = rawAny.messages.find((m: any) => m && m.key === activeKey) ||
                            rawAny.messages.find((m: any) => m && m.key === 'welcome') ||
                            rawAny.messages[0];
        if (welcomeItem) {
          store.chat.messages = [{
            key: welcomeItem.key || 'welcome',
            senderType: welcomeItem.senderType || 'AGENT',
            senderName: store.chat.agentName || rawAny.agentName || 'Sarah',
            body: welcomeItem.body || '',
            created: new Date().toISOString()
          }];
        }
      }
      if (!store.chat.hasSentMessage && (store.chatWindow.welcome?.enabled !== false || cc.welcome?.enabled !== false)) {
        store.chat.state = 'welcome';
      }
      emit('store:chat');
    }

    // Apply features config
    if (featuresConfig && Object.keys(featuresConfig).length > 0) {
      Object.assign(store.features, featuresConfig as Partial<FeaturesState>);
      emit('store:features');
    }
  } catch (err) {
    console.warn('initStore fetchClientConfig warning:', err);
  }

  // Store is fully built: replay any overrides queued by stories/templates.
  storeReady = true;
  applyStoreConfig(lastOverrides as UpdateStoreConfigOverrides);

  // Set up greet window visibility timers AFTER config overrides are applied
  setupGreetTimers();

  storeReadyResolve?.();
}

/* ────────── Greet-window visibility timers ────────── */
let _greetTimer: ReturnType<typeof setTimeout> | null = null;
let _inputTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * (Re-)schedules the greet-window and reply-bar visibility timers
 * based on the current store values. Clears any previously pending timers
 * so it is safe to call repeatedly (e.g. after Storybook control changes).
 */
export function setupGreetTimers() {
  // Clear any pending timers
  if (_greetTimer) { clearTimeout(_greetTimer); _greetTimer = null; }
  if (_inputTimer) { clearTimeout(_inputTimer); _inputTimer = null; }

  const currentStore = getStore();
  const gw = currentStore?.greetWindow;
  if (!gw || !gw.enabled) return;

  // Reset visibility so the timers can reveal them
  gw.visible = false;
  if (gw.inputBox) gw.inputBox = { ...gw.inputBox, visible: false };
  emit('store:greetWindow');

  const greetDelay = parseFloat(String(gw.openingTimeAfterInitialLoadSec ?? 2));
  _greetTimer = setTimeout(() => {
    const s = getStore();
    const curGw = s?.greetWindow;
    if (curGw && !curGw.dismissed && !s.chat.hasSentMessage) {
      s.greetWindow = { ...curGw, visible: true };
      emit('store:greetWindow');
    }
  }, greetDelay * 1000);

  if (gw.inputBox && gw.inputBox.enabled) {
    const inputDelay = parseFloat(String(gw.inputBox.openingTimeAfterInitialLoadSec ?? 4));
    _inputTimer = setTimeout(() => {
      const s = getStore();
      const curGw = s?.greetWindow;
      if (curGw && !curGw.dismissed && !s.chat.hasSentMessage && curGw.inputBox) {
        s.greetWindow = {
          ...curGw,
          inputBox: { ...curGw.inputBox, visible: true },
        };
        emit('store:greetWindow');
      }
    }, inputDelay * 1000);
  }
}


type UpdateStoreConfigOverrides = {
  enableWelcomeCard?: boolean;
  enableGreetWindow?: boolean;
  enableInputCard?: boolean;
  greetDelaySec?: number;
  greetAnimOpenSec?: number;
  greetAnimCloseSec?: number;
  inputBoxDelaySec?: number;
  inputBoxAnimOpenSec?: number;
  chatAnimStyle?: 'drop-in' | 'slide-up' | 'pop-in' | 'fade-in';
  chatAnimOpenSec?: number;
  chatAnimCloseSec?: number;
  triggerType?: 'bubble' | 'chatbar' | 'chatcard';
  bubble?: Partial<BubbleState>;
  chatbar?: Partial<ChatbarState>;
  greetWindow?: Partial<GreetWindowState>;
  chatWindow?: Partial<ChatWindowState>;
  chat?: Partial<ChatState>;
  features?: Partial<FeaturesState>;
};

/**
 * Applies overrides onto the shared store. If the store isn't initialized yet,
 * the latest overrides are retained and replayed after every `initStore()`, so
 * the atom/molecule stories and the template always read the same source.
 */
export function updateStoreConfig(overrides: UpdateStoreConfigOverrides) {
  if (overrides && typeof overrides === 'object') {
    lastOverrides = { ...lastOverrides, ...(overrides as Record<string, unknown>) };
    if (storeReady) {
      applyStoreConfig(overrides);
    }
  }
}

function applyStoreConfig(overrides: UpdateStoreConfigOverrides) {
  const store = getStore();

  if (overrides.enableWelcomeCard !== undefined && store.chatWindow.welcome) {
    store.chatWindow.welcome.enabled = overrides.enableWelcomeCard;
  }

  if (overrides.enableGreetWindow !== undefined) {
    store.greetWindow.enabled = overrides.enableGreetWindow;
  }

  if (overrides.enableInputCard !== undefined && store.greetWindow.inputBox) {
    store.greetWindow.inputBox.enabled = overrides.enableInputCard;
  }

  if (overrides.greetDelaySec !== undefined) {
    store.greetWindow.openingTimeAfterInitialLoadSec = overrides.greetDelaySec;
  }

  if (overrides.greetAnimOpenSec !== undefined) {
    store.greetWindow.animationOpeningSec = overrides.greetAnimOpenSec;
  }

  if (overrides.greetAnimCloseSec !== undefined) {
    store.greetWindow.animationClosingSec = overrides.greetAnimCloseSec;
  }

  if (overrides.inputBoxDelaySec !== undefined && store.greetWindow.inputBox) {
    store.greetWindow.inputBox.openingTimeAfterInitialLoadSec = overrides.inputBoxDelaySec;
  }

  if (overrides.inputBoxAnimOpenSec !== undefined && store.greetWindow.inputBox) {
    store.greetWindow.inputBox.animationOpeningSec = overrides.inputBoxAnimOpenSec;
  }

  if (overrides.chatAnimStyle !== undefined) {
    store.chatWindow.animationStyle = overrides.chatAnimStyle;
  }

  if (overrides.chatAnimOpenSec !== undefined) {
    store.chatWindow.animationOpeningSec = overrides.chatAnimOpenSec;
  }

  if (overrides.chatAnimCloseSec !== undefined) {
    store.chatWindow.animationClosingSec = overrides.chatAnimCloseSec;
  }

  if (overrides.bubble && typeof overrides.bubble === 'object') {
    Object.assign(store.bubble, overrides.bubble);
    emit('store:bubble');
  }

  if (overrides.chatbar && typeof overrides.chatbar === 'object') {
    Object.assign(store.chatbar, overrides.chatbar);
    emit('store:chatbar');
  }

  if (overrides.greetWindow && typeof overrides.greetWindow === 'object') {
    if (overrides.greetWindow.inputBox && store.greetWindow.inputBox) {
      store.greetWindow.inputBox = {
        ...store.greetWindow.inputBox,
        ...overrides.greetWindow.inputBox
      };
    }
    const { inputBox, ...rest } = overrides.greetWindow;
    Object.assign(store.greetWindow, rest);
    emit('store:greetWindow');
  }

  if (overrides.chatWindow && typeof overrides.chatWindow === 'object') {
    if (overrides.chatWindow.welcome && store.chatWindow.welcome) {
      store.chatWindow.welcome = {
        ...store.chatWindow.welcome,
        ...overrides.chatWindow.welcome
      };
    }
    const { welcome, ...rest } = overrides.chatWindow;
    Object.assign(store.chatWindow, rest);
    if (store.chatWindow.welcome?.enabled !== false && !store.chat.hasSentMessage) {
      store.chat.state = 'welcome';
      emit('store:chat');
    }
    emit('store:chatWindow');
  }

  if (overrides.chat && typeof overrides.chat === 'object') {
    if (Array.isArray(overrides.chat.messages) && overrides.chat.messages.length > 1) {
      const activeKey = (typeof window !== 'undefined' && (window as any).activeMessagePreviewKey) || 'welcome';
      const welcomeItem = overrides.chat.messages.find((m: any) => m && m.key === activeKey) ||
                          overrides.chat.messages.find((m: any) => m && m.key === 'welcome') ||
                          overrides.chat.messages[0];
      if (welcomeItem) {
        overrides.chat.messages = [{
          key: welcomeItem.key || 'welcome',
          senderType: welcomeItem.senderType || 'AGENT',
          senderName: store.chat.agentName || 'Sarah',
          body: welcomeItem.body || '',
          created: new Date().toISOString()
        }];
      }
    }
    Object.assign(store.chat, overrides.chat);
    emit('store:chat');
  }

  if (overrides.features && typeof overrides.features === 'object') {
    Object.assign(store.features, overrides.features);
    emit('store:features');
  }

  if (overrides.triggerType !== undefined) {
    if (overrides.triggerType === 'chatbar') {
      store.chatbar = { ...CHATBAR_BAR_PRESET, enabled: true };
    } else if (overrides.triggerType === 'chatcard') {
      store.chatbar = { ...CHATBAR_CARD_PRESET, enabled: true };
    }
    store.chatbar.enabled = overrides.triggerType !== 'bubble';
    store.bubble.enabled = overrides.triggerType === 'bubble';
    emit('store:chatbar');
    emit('store:bubble');
  }

  emit('store:greetWindow');
  emit('store:chatWindow');
  emit('store:chat');

  // Re-schedule greet timers if any delay/enablement override was touched
  const greetTimerKeys: (keyof UpdateStoreConfigOverrides)[] = [
    'enableGreetWindow', 'enableInputCard',
    'greetDelaySec', 'inputBoxDelaySec',
  ];
  const greetWindowOverride = overrides.greetWindow;
  const touchedGreetTimers = greetTimerKeys.some(k => overrides[k] !== undefined) ||
    (greetWindowOverride && (
      greetWindowOverride.openingTimeAfterInitialLoadSec !== undefined ||
      greetWindowOverride.enabled !== undefined ||
      (greetWindowOverride.inputBox && (
        greetWindowOverride.inputBox.openingTimeAfterInitialLoadSec !== undefined ||
        greetWindowOverride.inputBox.enabled !== undefined
      ))
    ));
  if (touchedGreetTimers) {
    setupGreetTimers();
  }
}

/**
 * Serializes the current active state of all store singletons into a full JSON configuration token,
 * matching the schema of default.json.
 */
export function exportFullStoreConfig(): Record<string, any> {
  const store = getStore();

  return {
    clientId: store.chat.clientName || 'default',
    clientName: store.chat.clientName || 'Default Widget',
    features: JSON.parse(JSON.stringify(store.features)),
    messages: JSON.parse(JSON.stringify(store.chat.messages)),
    greetWindow: JSON.parse(JSON.stringify(store.greetWindow)),
    bubble: JSON.parse(JSON.stringify(store.bubble)),
    chatWindow: JSON.parse(JSON.stringify(store.chatWindow)),
    chatbar: JSON.parse(JSON.stringify(store.chatbar))
  };
}

/**
 * Hydrates all store singletons with a full or partial JSON configuration token.
 */
export function injectStoreConfig(token: Record<string, any>): void {
  if (!token || typeof token !== 'object') return;
  hasInjectedCustomConfig = true;

  const store = getStore();
  if (token.features && store) {
    Object.assign(store.features, token.features);
    emit('store:features');
  }

  const chatWinObj = token.chatWindow || token.chatConfig || {};
  if (Object.keys(chatWinObj).length > 0 || token.accentColor || token.welcome) {
    const mergedChatWin = {
      ...(token.accentColor ? { accentColor: token.accentColor } : {}),
      ...(token.welcome ? { welcome: token.welcome } : {}),
      ...chatWinObj
    };
    activeInjectedChatWindowConfig = {
      ...activeInjectedChatWindowConfig,
      ...mergedChatWin
    };
  }

  let processedMessages = token.messages;
  if (Array.isArray(token.messages) && token.messages.length > 1) {
    const activeKey = (typeof window !== 'undefined' && (window as any).activeMessagePreviewKey) || 'welcome';
    const welcomeItem = token.messages.find((m: any) => m && m.key === activeKey) ||
                        token.messages.find((m: any) => m && m.key === 'welcome') ||
                        token.messages[0];
    if (welcomeItem) {
      processedMessages = [{
        key: welcomeItem.key || 'welcome',
        senderType: welcomeItem.senderType || 'AGENT',
        senderName: token.agentName || store?.chat.agentName || 'Sarah',
        body: welcomeItem.body || '',
        created: new Date().toISOString()
      }];
    }
  }

  const overrides: UpdateStoreConfigOverrides = {
    bubble: token.bubble || {},
    chatbar: token.chatbar || {},
    greetWindow: token.greetWindow || {},
    chatWindow: {
      ...(token.welcome ? { welcome: token.welcome } : {}),
      ...(token.chatWindow || token.chatConfig || {})
    },
    chat: {
      ...(token.chat || {}),
      ...(processedMessages ? { messages: processedMessages } : {}),
      ...(token.clientName ? { clientName: token.clientName } : {}),
      ...(token.agentName ? { agentName: token.agentName } : {})
    }
  };

  updateStoreConfig(overrides);
}

export function _resetStoreForTest(): void {
  store = null;
  hasInjectedCustomConfig = false;
  activeInjectedChatWindowConfig = {};
}


