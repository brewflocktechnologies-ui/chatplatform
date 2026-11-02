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
import { chatWidgetSocket } from '../services/socket-client.js';
import { formatTime } from '../utils/style-helpers.js';
import type {
  Message,
  ChatState,
  ChatWindowState,
  FeaturesState,
  BubbleState,
  GreetWindowState,
  ChatbarState,
  FullStore
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
    return s.flags[key] ?? defaultValue;
  },

  initSocket(url?: string, tenantId?: string, conversationId?: string, visitorName?: string) {
    if (typeof window === 'undefined') return;
    const wsUrl =
      url ||
      (window as any).CHAT_WIDGET_WS_URL ||
      'ws://localhost:8000/connection/websocket';

    chatWidgetSocket.setCallbacks({
      onMessage: ({ message, senderName }) => {
        // Skip messages authored by this visitor
        if (
          message.author === chatWidgetSocket.visitorName ||
          (message.sender === 'user' && message.author === chatWidgetSocket.visitorName)
        ) {
          return;
        }

        const curState = getStore().chat;
        const agentMsg: Message = {
          key: message.id || 'msg_' + Date.now(),
          senderType: 'AGENT',
          senderName: message.author || senderName || curState.agentName || 'Support Agent',
          body: message.text,
          created: message.timestamp || new Date().toISOString(),
          status: 'delivered'
        };

        if (!curState.messages.some((m) => m.key === agentMsg.key)) {
          curState.messages = [...curState.messages, agentMsg];
          if (!curState.panelOpen) {
            curState.unreadCount = (curState.unreadCount || 0) + 1;
          }
          curState.typingName = '';
          emit('store:chat');
        }
      },
      onTyping: ({ isTyping, senderName }) => {
        const curState = getStore().chat;
        curState.typingName = isTyping
          ? senderName || curState.agentName || 'Support Agent'
          : '';
        emit('store:chat');
      },
      onStatusChange: (status) => {
        const curState = getStore().chat;
        curState.reconnecting = status === 'connecting' || status === 'error';
        emit('store:chat');
      }
    });

    chatWidgetSocket.connect(wsUrl, {
      tenantId: tenantId || 'demo-tenant',
      conversationId: conversationId || chatWidgetSocket.conversationId,
      senderName: visitorName || chatWidgetSocket.visitorName
    });
  },

  sendTyping(isTyping: boolean) {
    if (chatWidgetSocket.isConnected) {
      chatWidgetSocket.sendTyping(isTyping);
    }
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

    if (chatWidgetSocket.isConnected) {
      // Send real message over WebSocket
      chatWidgetSocket.sendMessage(text, chatWidgetSocket.visitorName);
      chatWidgetSocket.sendTyping(false);

      setTimeout(() => {
        const idx = s.messages.findIndex((m) => m.key === msgObj.key);
        if (idx !== -1) {
          s.messages = s.messages.map((m, i) =>
            i === idx ? { ...m, status: 'delivered' } : m
          );
          emit('store:chat');
        }
      }, 300);
    } else {
      // Connect if not yet connected
      if (typeof window !== 'undefined') {
        chatStore.initSocket();
      }

      // Offline fallback: simulated delivery and bot response
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
    }
  },

  resetChatbarLayout() {
    const cb = getStore().chatbar;
    if (cb.enabled && cb.layout === 'card') {
      cb.layout = 'bar';
      cb.height = 40;
      cb.width = 255;
      cb.offsetRight =
        cb.barOffsetRight ?? 16;
      cb.offsetBottom =
        cb.barOffsetBottom ?? 12;
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
    const isPostchatEnabled = overridePostchatEnabled ?? fs.postchatEnabled ?? false;
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
    const isPrechatEnabled = overridePrechatEnabled ?? fs.prechatEnabled ?? false;
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
      anchor.remove();
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
    s.lastFeedback = { ...values };
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
    if (input.files?.[0]) {
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
    if (!dataUrl?.startsWith('data:')) return;
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
    return formatTime(msg.created);
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

type Theme = ReturnType<typeof getParentTheme>;

/** True when a (sanitized) remote config section carries at least one key. */
function hasKeys(section: unknown): boolean {
  return !!section && Object.keys(section as object).length > 0;
}

function applyRemoteBubble(bc: Partial<BubbleState>, theme: Theme, rootAccentColor: string | undefined) {
  if (bc.useWebsiteTheme) {
    bc.backgroundColor = theme.primary;
    bc.gradientType = 'none';
    if (bc.outlineRing) bc.outlineRing.color = theme.secondary;
  } else if (rootAccentColor && !bc.backgroundColor) {
    bc.backgroundColor = rootAccentColor;
    if (bc.outlineRing && !bc.outlineRing.color) bc.outlineRing.color = rootAccentColor;
  }
  Object.assign(store!.bubble, bc);
  if (bc.position) store!.greetWindow.position = bc.position;
  emit('store:bubble');
  emit('store:greetWindow');
}

/** Colours the greet-window input box from the host theme (`theme`) or the accent colour. */
function colorGreetInputBox(inputBox: NonNullable<GreetWindowState['inputBox']>, color: string, overwrite: boolean) {
  if (inputBox.layout === 'separated') {
    if (overwrite || !inputBox.buttonIconColor) inputBox.buttonIconColor = color;
  } else if (overwrite || !inputBox.buttonColor) {
    inputBox.buttonColor = color;
  }
}

function applyRemoteGreetWindow(gwc: Partial<GreetWindowState>, theme: Theme, rootAccentColor: string | undefined) {
  if (gwc.inputBox) {
    gwc.inputBox = { ...store!.greetWindow.inputBox, ...gwc.inputBox };
  }
  if (gwc.useWebsiteTheme) {
    gwc.iconColor = theme.primary;
    if (gwc.inputBox) colorGreetInputBox(gwc.inputBox, theme.primary, true);
  } else if (rootAccentColor) {
    if (!gwc.iconColor) gwc.iconColor = rootAccentColor;
    if (gwc.inputBox) colorGreetInputBox(gwc.inputBox, rootAccentColor, false);
  }
  Object.assign(store!.greetWindow, gwc);
  emit('store:greetWindow');
}

function applyRemoteChatbar(cbc: Partial<ChatbarState>, theme: Theme, rootAccentColor: string | undefined) {
  if (cbc.useWebsiteTheme) {
    cbc.bgColor = theme.primary;
  } else if (rootAccentColor && !cbc.bgColor) {
    cbc.bgColor = rootAccentColor;
  }
  const cb = store!.chatbar;
  Object.assign(cb, cbc);
  const right = cb.layout === 'card' ? cb.cardOffsetRight : cb.barOffsetRight;
  const bottom = cb.layout === 'card' ? cb.cardOffsetBottom : cb.barOffsetBottom;
  if (right !== undefined && right !== null) cb.offsetRight = right;
  if (bottom !== undefined && bottom !== null) cb.offsetBottom = bottom;
  emit('store:chatbar');
}

/** Chat-window colours that fall back to the host theme's primary colour. */
function websiteThemeDefaults(theme: Theme): Array<[string, string]> {
  return [
    ['accentColor', theme.primary],
    ['visitorBubbleBg', theme.primary],
    ['visitorBubbleColor', '#ffffff'],
    ['headerBg', theme.primary],
    ['headerTextColor', '#ffffff'],
    ['headerAvatarBg', 'rgba(255,255,255,0.2)'],
    ['headerAvatarColor', '#ffffff'],
    ['agentAvatarBg', theme.primary],
    ['agentAvatarColor', '#ffffff'],
    ['inputFocusBorderColor', theme.primary],
    ['inputFocusShadow', `0 0 0 2px ${theme.primary}26`],
    ['sendButtonBgActive', theme.primary],
    ['poweredByColor', theme.primary],
    ['endChatConfirmBg', theme.primary],
    ['endChatConfirmTextColor', '#ffffff']
  ];
}

const DARK_MODE_CHAT_COLORS: Readonly<Record<string, string>> = {
  bodyBg: 'var(--cw-bg)',
  inputBg: 'var(--cw-surface)',
  agentBubbleBg: 'var(--cw-surface)',
  agentBubbleColor: 'var(--cw-ink)',
  agentBubbleBorderColor: 'var(--cw-border)',
  footerBg: 'var(--cw-bg)',
  footerTextColor: 'var(--cw-muted)',
  inputTextColor: 'var(--cw-ink)',
  inputBorderColor: 'var(--cw-border)',
  attachButtonBg: 'var(--cw-surface)',
  attachButtonColor: 'var(--cw-muted)',
  emojiButtonColor: 'var(--cw-muted)',
  modalCardBg: 'var(--cw-surface)',
  modalMessageColor: 'var(--cw-ink)',
  endChatCancelBg: 'var(--cw-surface)',
  endChatCancelTextColor: 'var(--cw-muted)',
  endChatCancelBorderColor: 'var(--cw-border)'
};

/** Chat-window keys that take the root accent colour when the remote config left them unset. */
const ACCENT_FALLBACK_KEYS = [
  'accentColor',
  'visitorBubbleBg',
  'headerBg',
  'agentAvatarBg',
  'inputFocusBorderColor',
  'inputFocusShadow',
  'sendButtonBgActive',
  'poweredByColor',
  'endChatConfirmBg'
] as const;

function applyWebsiteThemeColors(active: Record<string, any>, theme: Theme, isDark: boolean) {
  for (const [key, value] of websiteThemeDefaults(theme)) {
    active[key] = active[key] || value;
  }
  if (isDark) Object.assign(active, DARK_MODE_CHAT_COLORS);
}

function applyAccentColors(active: Record<string, any>, cc: Record<string, any>, accent: string) {
  for (const key of ACCENT_FALLBACK_KEYS) {
    if (cc[key]) continue;
    active[key] = key === 'inputFocusShadow' ? `0 0 0 2px ${accent}26` : accent;
  }
}

function applyWelcomeTheme(
  active: Record<string, any>,
  theme: Theme,
  rootAccentColor: string | undefined,
  useWebTheme: boolean
) {
  const welcomeObj = active.welcome || store!.chatWindow.welcome;
  if (!welcomeObj || welcomeObj.bgGradient) return;
  const welcomeUseTheme = welcomeObj.useWebsiteTheme ?? (useWebTheme && !hasInjectedCustomConfig);
  if (welcomeUseTheme) {
    const sec = theme.secondary && theme.secondary !== theme.primary ? theme.secondary : theme.primary;
    welcomeObj.bgGradient = `linear-gradient(135deg, ${theme.primary}, ${sec})`;
    welcomeObj.buttonIconColor = welcomeObj.buttonIconColor || theme.primary;
    active.welcome = welcomeObj;
  } else if (rootAccentColor) {
    welcomeObj.bgGradient = `linear-gradient(135deg, ${rootAccentColor}, ${rootAccentColor})`;
    if (!welcomeObj.buttonIconColor) welcomeObj.buttonIconColor = rootAccentColor;
    active.welcome = welcomeObj;
  }
}

/** Re-derives the themed chat-window config; re-run whenever the host switches light/dark. */
function applyChatTheme(cc: Record<string, any>, theme: Theme, rootAccentColor: string | undefined) {
  const isDark = isHostDark();
  const effectiveChatConfig = {
    ...store?.chatWindow,
    ...cc,
    ...activeInjectedChatWindowConfig
  };
  const active = JSON.parse(JSON.stringify(effectiveChatConfig)) as Record<string, any>;

  const useWebTheme = cc.useWebsiteTheme ?? (rootAccentColor ? false : active.useWebsiteTheme);

  if (useWebTheme && !hasInjectedCustomConfig) {
    applyWebsiteThemeColors(active, theme, isDark);
  } else if (rootAccentColor) {
    applyAccentColors(active, cc, rootAccentColor);
  }

  applyWelcomeTheme(active, theme, rootAccentColor, useWebTheme);

  if (isDark && hasKeys(cc.dark)) {
    Object.assign(active, cc.dark);
  }

  Object.assign(store!.chatWindow, active);
  emit('store:chatWindow');
}

/** Picks the welcome message from a remote `messages` list (active preview key, then 'welcome', then first). */
function pickWelcomeMessage(messages: any[]) {
  const activeKey = (typeof window !== 'undefined' && (window as any).activeMessagePreviewKey) || 'welcome';
  return messages.find((m: any) => m?.key === activeKey) ||
    messages.find((m: any) => m?.key === 'welcome') ||
    messages[0];
}

function toWelcomeMessage(item: any, senderName: string): Message {
  return {
    key: item.key || 'welcome',
    senderType: item.senderType || 'AGENT',
    senderName,
    body: item.body || '',
    created: new Date().toISOString()
  };
}

function applyRemoteMessages(rawConfig: any) {
  if (!Array.isArray(rawConfig.messages) || rawConfig.messages.length === 0) return;
  const welcomeItem = pickWelcomeMessage(rawConfig.messages);
  if (!welcomeItem) return;
  store!.chat.messages = [
    toWelcomeMessage(welcomeItem, store!.chat.agentName || rawConfig.agentName || 'Sarah')
  ];
}

function applyRemoteChat(
  cc: Record<string, any>,
  rawConfig: any,
  theme: Theme,
  rootAccentColor: string | undefined
) {
  const s = store!;
  if (cc.welcome) {
    s.chatWindow.welcome = { ...s.chatWindow.welcome, ...cc.welcome };
  }

  applyChatTheme(cc, theme, rootAccentColor);
  observeDarkMode(() => applyChatTheme(cc, theme, rootAccentColor));

  // Sync chat agent/client names
  if (cc.clientName) s.chat.clientName = cc.clientName;
  if (cc.agentName) {
    s.chat.agentName = cc.agentName;
    /* v8 ignore next -- initStore always seeds a welcome message, so messages[0] is never empty here */
    if (s.chat.messages[0]) s.chat.messages[0].senderName = cc.agentName;
  }
  applyRemoteMessages(rawConfig);
  if (!s.chat.hasSentMessage && (s.chatWindow.welcome?.enabled !== false || cc.welcome?.enabled !== false)) {
    s.chat.state = 'welcome';
  }
  emit('store:chat');
}

function applyRemoteConfig(rawConfig: any, theme: Theme) {
  // Untrusted remote config: strip CSS-injection payloads before merging.
  const rootAccentColor = rawConfig.accentColor;
  const bubbleConfig = sanitizeConfig(rawConfig.bubbleConfig).value;
  const greetWindowConfig = sanitizeConfig(rawConfig.greetWindowConfig).value;
  const chatbarConfig = sanitizeConfig(rawConfig.chatbarConfig).value;
  const chatConfig = sanitizeConfig(rawConfig.chatConfig).value;
  const featuresConfig = sanitizeConfig(rawConfig.featuresConfig).value;

  if (hasKeys(bubbleConfig)) {
    applyRemoteBubble(bubbleConfig as Partial<BubbleState>, theme, rootAccentColor);
  }
  if (hasKeys(greetWindowConfig)) {
    applyRemoteGreetWindow(greetWindowConfig as Partial<GreetWindowState>, theme, rootAccentColor);
  }
  if (hasKeys(chatbarConfig)) {
    applyRemoteChatbar(chatbarConfig as Partial<ChatbarState>, theme, rootAccentColor);
  }
  if (hasKeys(chatConfig)) {
    applyRemoteChat(chatConfig as Record<string, any>, rawConfig, theme, rootAccentColor);
  }
  if (hasKeys(featuresConfig)) {
    Object.assign(store!.features, featuresConfig as Partial<FeaturesState>);
    emit('store:features');
  }
}

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
    chatbar: buildDefaultChatbar(theme)
  };

  // Emit initial state
  emit('store:bubble');
  emit('store:greetWindow');
  emit('store:chatWindow');
  emit('store:features');
  emit('store:chat');
  emit('store:chatbar');

  try {
    applyRemoteConfig(await fetchClientConfig(clientId), theme);
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

  const greetDelay = Number.parseFloat(String(gw.openingTimeAfterInitialLoadSec ?? 2));
  _greetTimer = setTimeout(() => {
    const s = getStore();
    const curGw = s?.greetWindow;
    if (curGw && !curGw.dismissed && !s.chat.hasSentMessage) {
      s.greetWindow = { ...curGw, visible: true };
      emit('store:greetWindow');
    }
  }, greetDelay * 1000);

  if (gw.inputBox && gw.inputBox.enabled) {
    const inputDelay = Number.parseFloat(String(gw.inputBox.openingTimeAfterInitialLoadSec ?? 4));
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

function applyGreetScalarOverrides(store: FullStore, overrides: UpdateStoreConfigOverrides) {
  const gw = store.greetWindow;
  if (overrides.enableGreetWindow !== undefined) gw.enabled = overrides.enableGreetWindow;
  if (overrides.greetDelaySec !== undefined) gw.openingTimeAfterInitialLoadSec = overrides.greetDelaySec;
  if (overrides.greetAnimOpenSec !== undefined) gw.animationOpeningSec = overrides.greetAnimOpenSec;
  if (overrides.greetAnimCloseSec !== undefined) gw.animationClosingSec = overrides.greetAnimCloseSec;

  const inputBox = gw.inputBox;
  if (!inputBox) return;
  if (overrides.enableInputCard !== undefined) inputBox.enabled = overrides.enableInputCard;
  if (overrides.inputBoxDelaySec !== undefined) inputBox.openingTimeAfterInitialLoadSec = overrides.inputBoxDelaySec;
  if (overrides.inputBoxAnimOpenSec !== undefined) inputBox.animationOpeningSec = overrides.inputBoxAnimOpenSec;
}

function applyChatWindowScalarOverrides(store: FullStore, overrides: UpdateStoreConfigOverrides) {
  const cw = store.chatWindow;
  if (overrides.enableWelcomeCard !== undefined && cw.welcome) cw.welcome.enabled = overrides.enableWelcomeCard;
  if (overrides.chatAnimStyle !== undefined) cw.animationStyle = overrides.chatAnimStyle;
  if (overrides.chatAnimOpenSec !== undefined) cw.animationOpeningSec = overrides.chatAnimOpenSec;
  if (overrides.chatAnimCloseSec !== undefined) cw.animationClosingSec = overrides.chatAnimCloseSec;
}

function applyGreetWindowOverride(store: FullStore, override: Partial<GreetWindowState>) {
  if (override.inputBox && store.greetWindow.inputBox) {
    store.greetWindow.inputBox = { ...store.greetWindow.inputBox, ...override.inputBox };
  }
  const { inputBox, ...rest } = override;
  Object.assign(store.greetWindow, rest);
  emit('store:greetWindow');
}

function applyChatWindowOverride(store: FullStore, override: Partial<ChatWindowState>) {
  if (override.welcome && store.chatWindow.welcome) {
    store.chatWindow.welcome = { ...store.chatWindow.welcome, ...override.welcome };
  }
  const { welcome, ...rest } = override;
  Object.assign(store.chatWindow, rest);
  if (store.chatWindow.welcome?.enabled !== false && !store.chat.hasSentMessage) {
    store.chat.state = 'welcome';
    emit('store:chat');
  }
  emit('store:chatWindow');
}

function applyChatOverride(store: FullStore, override: Partial<ChatState>) {
  if (Array.isArray(override.messages) && override.messages.length > 1) {
    const welcomeItem = pickWelcomeMessage(override.messages);
    if (welcomeItem) {
      override.messages = [toWelcomeMessage(welcomeItem, store.chat.agentName || 'Sarah')];
    }
  }
  Object.assign(store.chat, override);
  emit('store:chat');
}

function applyTriggerType(store: FullStore, triggerType: NonNullable<UpdateStoreConfigOverrides['triggerType']>) {
  if (triggerType === 'chatbar') {
    store.chatbar = { ...CHATBAR_BAR_PRESET, enabled: true };
  } else if (triggerType === 'chatcard') {
    store.chatbar = { ...CHATBAR_CARD_PRESET, enabled: true };
  }
  store.chatbar.enabled = triggerType !== 'bubble';
  store.bubble.enabled = triggerType === 'bubble';
  emit('store:chatbar');
  emit('store:bubble');
}

const GREET_TIMER_KEYS: ReadonlyArray<keyof UpdateStoreConfigOverrides> = [
  'enableGreetWindow',
  'enableInputCard',
  'greetDelaySec',
  'inputBoxDelaySec'
];

/** True when the overrides change anything the greet-window timers depend on. */
function touchesGreetTimers(overrides: UpdateStoreConfigOverrides): boolean {
  const gw = overrides.greetWindow;
  const inputBox = gw?.inputBox;
  return (
    GREET_TIMER_KEYS.some((k) => overrides[k] !== undefined) ||
    gw?.openingTimeAfterInitialLoadSec !== undefined ||
    gw?.enabled !== undefined ||
    inputBox?.openingTimeAfterInitialLoadSec !== undefined ||
    inputBox?.enabled !== undefined
  );
}

function isObject(value: unknown): value is object {
  return !!value && typeof value === 'object';
}

function applyStoreConfig(overrides: UpdateStoreConfigOverrides) {
  const store = getStore();

  applyChatWindowScalarOverrides(store, overrides);
  applyGreetScalarOverrides(store, overrides);

  if (isObject(overrides.bubble)) {
    Object.assign(store.bubble, overrides.bubble);
    emit('store:bubble');
  }

  if (isObject(overrides.chatbar)) {
    Object.assign(store.chatbar, overrides.chatbar);
    emit('store:chatbar');
  }

  if (isObject(overrides.greetWindow)) applyGreetWindowOverride(store, overrides.greetWindow);
  if (isObject(overrides.chatWindow)) applyChatWindowOverride(store, overrides.chatWindow);
  if (isObject(overrides.chat)) applyChatOverride(store, overrides.chat);

  if (isObject(overrides.features)) {
    Object.assign(store.features, overrides.features);
    emit('store:features');
  }

  if (overrides.triggerType !== undefined) applyTriggerType(store, overrides.triggerType);

  emit('store:greetWindow');
  emit('store:chatWindow');
  emit('store:chat');

  // Re-schedule greet timers if any delay/enablement override was touched
  if (touchesGreetTimers(overrides)) {
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

/** Welcome-only `messages` list for an injected token (active preview key wins), or the token's own list. */
function injectedMessages(token: Record<string, any>, store: FullStore | null) {
  if (!Array.isArray(token.messages) || token.messages.length <= 1) return token.messages;
  const welcomeItem = pickWelcomeMessage(token.messages);
  if (!welcomeItem) return token.messages;
  return [toWelcomeMessage(welcomeItem, token.agentName || store?.chat.agentName || 'Sarah')];
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
    activeInjectedChatWindowConfig = {
      ...activeInjectedChatWindowConfig,
      ...(token.accentColor && { accentColor: token.accentColor }),
      ...(token.welcome && { welcome: token.welcome }),
      ...chatWinObj
    };
  }

  const processedMessages = injectedMessages(token, store);

  updateStoreConfig({
    bubble: token.bubble || {},
    chatbar: token.chatbar || {},
    greetWindow: token.greetWindow || {},
    chatWindow: {
      ...(token.welcome && { welcome: token.welcome }),
      ...chatWinObj
    },
    chat: {
      ...token.chat,
      ...(processedMessages && { messages: processedMessages }),
      ...(token.clientName && { clientName: token.clientName }),
      ...(token.agentName && { agentName: token.agentName })
    }
  });
}

export function _resetStoreForTest(): void {
  store = null;
  hasInjectedCustomConfig = false;
  activeInjectedChatWindowConfig = {};
}


