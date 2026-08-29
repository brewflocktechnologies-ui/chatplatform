import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  initStore,
  subscribeAll,
  chatStore,
  bubbleStore,
  chatbarStore,
  greetWindowStore,
  chatWindowStore,
  featuresStore,
  setupGreetTimers,
} from '../../store/chat-store.js';
import {
  computeEffectiveChatbarConfig,
  computeEffectiveBubbleConfig,
  computeEffectiveGreetWindowConfig,
  computeEffectiveChatWindowConfig,
  computeEffectiveFeaturesConfig,
} from '../../tokens/merge.js';
import { getParentTheme } from '../../utils/theme.js';
import '../templates/cw-widget-layout.js';

/**
 * cw-widget-root
 * Page component representing the live chat widget page container.
 * Connects to stores, handles property merging, wires event bus listeners,
 * manages focus traps, and renders the structural `<cw-widget-layout>` template.
 */
@customElement('cw-widget-root')
export class CwWidgetRoot extends LitElement {
  // -------------------------------------------------------------------------
  // 1. Widget & Layout
  // -------------------------------------------------------------------------
  @property({ type: String }) clientName?: string;
  @property({ type: String }) agentName?: string;
  @property({ type: Number }) widgetWidth?: number;
  @property({ type: Number }) widgetHeight?: number;
  @property({ type: Number }) expandedWidth?: number;
  @property({ type: Number }) widgetBorderRadius?: number;
  @property({ type: String }) accentColor?: string;
  @property({ type: Boolean }) useWebsiteTheme?: boolean;

  // -------------------------------------------------------------------------
  // 2. Trigger & Positioning (Bubble)
  // -------------------------------------------------------------------------
  @property({ type: String }) triggerType?: 'bubble' | 'chatbar' | 'chatcard';
  @property({ type: Number }) bubbleOffsetRight?: number;
  @property({ type: Number }) bubbleOffsetBottom?: number;
  @property({ type: Number }) barOffsetRight?: number;
  @property({ type: Number }) barOffsetBottom?: number;
  @property({ type: Number }) cardOffsetRight?: number;
  @property({ type: Number }) cardOffsetBottom?: number;
  @property({ type: Number }) bubbleWidth?: number;
  @property({ type: Number }) bubbleHeight?: number;
  @property({ type: Boolean }) bubbleHideOnOpen?: boolean;
  @property({ type: String }) bubbleBg?: string;
  @property({ type: String }) bubbleGradientType?: 'none' | 'linear' | 'radial';
  @property({ type: Number }) bubbleGradientAngle?: number;
  @property({ type: String }) bubbleGradientStart?: string;
  @property({ type: String }) bubbleGradientEnd?: string;
  @property({ type: Number }) bubbleBorderWidth?: number;
  @property({ type: String }) bubbleBorderStyle?: 'solid' | 'dashed' | 'dotted';
  @property({ type: String }) bubbleBorderColor?: string;
  @property({ type: Boolean }) bubbleOutlineRingEnabled?: boolean;
  @property({ type: Number }) bubbleOutlineRingWidth?: number;
  @property({ type: String }) bubbleOutlineRingColor?: string;
  @property({ type: Number }) bubbleBoxShadowBlur?: number;
  @property({ type: Number }) bubbleBoxShadowOffsetY?: number;
  @property({ type: Number }) bubbleBoxShadowOpacity?: number;
  @property({ type: Boolean }) bubbleInnerShadowEnabled?: boolean;
  @property({ type: Boolean }) bubbleGlassEnabled?: boolean;
  @property({ type: Number }) bubbleGlassBlur?: number;
  @property({ type: Boolean }) bubbleNeonEnabled?: boolean;
  @property({ type: String }) bubbleNeonColor?: string;
  @property({ type: String }) bubbleLucideIcon?: string;
  @property({ type: Number }) bubbleLucideSize?: number;
  @property({ type: String }) bubbleIconColor?: string;
  @property({ type: Number }) bubbleHoverScale?: number;
  @property({ type: Boolean }) bubbleIdleAnimEnabled?: boolean;
  @property({ type: String }) bubbleIdleAnimType?: 'none' | 'bounce' | 'pulse' | 'float';
  @property({ type: Boolean }) bubbleTooltipEnabled?: boolean;
  @property({ type: String }) bubbleTooltipText?: string;
  @property({ type: String }) bubbleTooltipPosition?: string;
  @property({ type: String }) bubbleTooltipBg?: string;
  @property({ type: String }) bubbleTooltipTextColor?: string;
  @property({ type: String }) bubbleBadgePosition?: 'top-right' | 'top-left' | 'bottom-right';
  @property({ type: String }) bubbleBadgeBg?: string;
  @property({ type: String }) bubbleBadgeTextColor?: string;

  // -------------------------------------------------------------------------
  // 3. Chatbar Trigger Layout
  // -------------------------------------------------------------------------
  @property({ type: String }) chatbarLayout?: 'bar' | 'card';
  @property({ type: Number }) chatbarWidth?: number;
  @property({ type: Number }) chatbarHeight?: number;
  @property({ type: String }) chatbarBg?: string;
  @property({ type: Boolean }) chatbarGradientEnabled?: boolean;
  @property({ type: String }) chatbarGradientStart?: string;
  @property({ type: String }) chatbarGradientEnd?: string;
  @property({ type: Number }) chatbarBorderRadius?: number;
  @property({ type: String }) chatbarText?: string;
  @property({ type: String }) chatcardText?: string;
  @property({ type: Number }) chatbarTextSize?: number;
  @property({ type: String }) chatbarTextColor?: string;
  @property({ type: String }) chatbarLucideIcon?: string;
  @property({ type: Number }) chatbarIconSize?: number;
  @property({ type: String }) chatbarIconColor?: string;

  // -------------------------------------------------------------------------
  // 4. Proactive Greet Window
  // -------------------------------------------------------------------------
  @property({ type: Boolean }) enableGreetWindow?: boolean;
  @property({ type: String }) greetTitle?: string;
  @property({ type: String }) greetTitleColor?: string;
  @property({ type: Number }) greetTitleFontSize?: number;
  @property({ type: String }) greetDescription?: string;
  @property({ type: String }) greetDescriptionColor?: string;
  @property({ type: Number }) greetDescriptionFontSize?: number;
  @property({ type: String }) greetBg?: string;
  @property({ type: Number }) greetWidth?: number;
  @property({ type: Number }) greetBorderRadius?: number;
  @property({ type: Number }) greetSpacing?: number;
  @property({ type: Number }) greetOpeningDelaySec?: number;
  @property({ type: Number }) greetFadeInSpeedSec?: number;
  @property({ type: String }) greetIconType?: 'lucide' | 'image' | 'customSvg';
  @property({ type: String }) greetIconAlign?: 'center' | 'left' | 'right';
  @property({ type: String }) greetLucideIcon?: string;
  @property({ type: Number }) greetIconSize?: number;
  @property({ type: String }) greetIconColor?: string;
  @property({ type: String }) greetIconAnimation?: 'none' | 'wiggle' | 'pulse' | 'bounce';
  @property({ type: String }) greetImageUrl?: string;
  @property({ type: Boolean }) enableInputCard?: boolean;
  @property({ type: Number }) greetInputOpeningDelaySec?: number;
  @property({ type: String }) greetInputLayout?: 'separated' | 'integrated';
  @property({ type: String }) greetInputPlaceholder?: string;
  @property({ type: String }) greetInputBg?: string;
  @property({ type: String }) greetInputTextColor?: string;
  @property({ type: Number }) greetInputBorderRadius?: number;
  @property({ type: String }) greetInputButtonColor?: string;
  @property({ type: String }) greetInputButtonIconColor?: string;

  // -------------------------------------------------------------------------
  // 5. Welcome Dashboard Card
  // -------------------------------------------------------------------------
  @property({ type: Boolean }) enableWelcomeCard?: boolean;
  @property({ type: String }) welcomeCardLayout?: 'glassy' | 'normal';
  @property({ type: String }) welcomeTitle?: string;
  @property({ type: String }) welcomeDescription?: string;
  @property({ type: String }) welcomeBgGradient?: string;
  @property({ type: String }) welcomeButtonText?: string;
  @property({ type: String }) welcomeButtonSubtext?: string;
  @property({ type: String }) welcomeButtonBg?: string;
  @property({ type: String }) welcomeButtonTextColor?: string;
  @property({ type: String }) welcomeLogoUrl?: string;
  @property({ type: Number }) welcomeCardBorderRadius?: number;
  @property({ type: Number }) welcomeCardBlur?: number;

  // -------------------------------------------------------------------------
  // 6. Header & Features
  // -------------------------------------------------------------------------
  @property({ type: String }) headerBg?: string;
  @property({ type: String }) headerTextColor?: string;
  @property({ type: String }) headerBorderColor?: string;
  @property({ type: String }) headerAvatarBg?: string;
  @property({ type: String }) headerAvatarColor?: string;
  @property({ type: String }) activeDotColor?: string;
  @property({ type: Boolean }) activeDotAnimate?: boolean;
  @property({ type: Boolean }) enableVoiceCall?: boolean;
  @property({ type: Boolean }) enableVideoCall?: boolean;
  @property({ type: Boolean }) enableCloseChatVisitor?: boolean;
  @property({ type: Boolean }) prechatEnabled?: boolean;
  @property({ type: Boolean }) postchatEnabled?: boolean;

  // -------------------------------------------------------------------------
  // 7. Messages & Bubbles
  // -------------------------------------------------------------------------
  @property({ type: String }) bodyBg?: string;
  @property({ type: String }) visitorBubbleBg?: string;
  @property({ type: String }) visitorBubbleTextColor?: string;
  @property({ type: Number }) visitorBubbleFontSize?: number;
  @property({ type: Number }) visitorBubbleBorderRadius?: number;
  @property({ type: String }) agentBubbleBg?: string;
  @property({ type: String }) agentBubbleTextColor?: string;
  @property({ type: String }) agentBubbleBorderColor?: string;
  @property({ type: Number }) agentBubbleFontSize?: number;
  @property({ type: Number }) agentBubbleBorderRadius?: number;
  @property({ type: String }) agentAvatarBg?: string;
  @property({ type: String }) agentAvatarColor?: string;
  @property({ type: String }) agentAvatarUrl?: string;

  // -------------------------------------------------------------------------
  // 8. Composer & Input Field Controls
  // -------------------------------------------------------------------------
  @property({ type: String }) inputBg?: string;
  @property({ type: String }) inputTextColor?: string;
  @property({ type: String }) inputPlaceholderColor?: string;
  @property({ type: String }) inputBorderColor?: string;
  @property({ type: String }) inputFocusBorderColor?: string;
  @property({ type: Number }) inputBorderRadius?: number;
  @property({ type: Number }) textareaFontSize?: number;
  @property({ type: String }) attachButtonBg?: string;
  @property({ type: String }) attachButtonColor?: string;
  @property({ type: String }) emojiButtonColor?: string;
  @property({ type: String }) sendIconType?: 'arrow' | 'send';
  @property({ type: String }) sendButtonBgActive?: string;
  @property({ type: String }) sendButtonColorActive?: string;
  @property({ type: String }) sendButtonBgInactive?: string;
  @property({ type: String }) sendButtonColorInactive?: string;
  @property({ type: Boolean }) modernUi?: boolean;
  @property({ type: Boolean }) typingIndicator?: boolean;
  @property({ type: Boolean }) attachmentsEnabled?: boolean;
  @property({ type: Boolean }) ticksEnabled?: boolean;
  @property({ type: String }) sentTickColor?: string;
  @property({ type: String }) readTickColor?: string;

  // -------------------------------------------------------------------------
  // 9. Footer, Frame & Modals
  // -------------------------------------------------------------------------
  @property({ type: String }) footerBg?: string;
  @property({ type: String }) footerTextColor?: string;
  @property({ type: String }) poweredByText?: string;
  @property({ type: String }) poweredByLink?: string;
  @property({ type: String }) poweredByColor?: string;
  @property({ type: Boolean }) widgetShadow?: boolean;
  @property({ type: Number }) widgetShadowBlur?: number;
  @property({ type: String }) widgetShadowColor?: string;
  @property({ type: Boolean }) widgetBorderEnabled?: boolean;
  @property({ type: Number }) widgetBorderWidth?: number;
  @property({ type: String }) widgetBorderColor?: string;
  @property({ type: String }) endChatConfirmMessage?: string;
  @property({ type: String }) endChatConfirmLabel?: string;
  @property({ type: String }) endChatCancelLabel?: string;
  @property({ type: String }) modalCardBg?: string;
  @property({ type: String }) modalMessageColor?: string;
  @property({ type: Number }) modalBorderRadius?: number;
  @property({ type: String }) endChatConfirmBg?: string;
  @property({ type: String }) endChatConfirmTextColor?: string;

  @state() panelOpen = false;
  @state() initialized = false;
  @state() private userHasSentMessage = false;
  @state() private activeTriggerOverride?: 'bubble' | 'chatbar' | 'chatcard';
  @state() private rev = 0;

  /** Host-page theme (--primary/--secondary). Resolved once (or when
   *  `useWebsiteTheme` flips) so the render path never touches the DOM —
   *  previously every `computeEffective*` call re-ran getComputedStyle. */
  private cachedTheme: { primary: string; secondary: string } | null = null;

  private unsubAll?: () => void;
  private eventListeners: Array<[string, EventListener]> = [];

  private toggleListener = () => this.handleToggleWidget();
  private closeListener = () => this.handleCloseWidget();
  private onKeydown = (e: KeyboardEvent) => this.handleKeydown(e);

  /** Resolves the host theme on demand; null when the widget uses its own colors. */
  private applyThemeCache() {
    this.cachedTheme = this.useWebsiteTheme !== false ? getParentTheme() : null;
  }

  async connectedCallback() {
    super.connectedCallback();

    try {
      await initStore();
    } catch (err) {
      console.warn('CwWidgetRoot initStore warning:', err);
    } finally {
      this.applyThemeCache();
      this.unsubAll = subscribeAll(() => {
        this.rev++;
      });

      window.addEventListener('toggle-contact-widget', this.toggleListener);
      window.addEventListener('close-contact-widget', this.closeListener);

      this.addEventListener('keydown', this.onKeydown);

      this.registerLeafEvents();
      this.initialized = true;
      this.requestUpdate();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unsubAll?.();
    window.removeEventListener('toggle-contact-widget', this.toggleListener);
    window.removeEventListener('close-contact-widget', this.closeListener);
    this.removeEventListener('keydown', this.onKeydown);
    for (const [name, fn] of this.eventListeners) {
      this.removeEventListener(name, fn);
    }
    this.eventListeners = [];
  }

  updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);
    if (changedProperties.has('useWebsiteTheme')) {
      this.applyThemeCache();
    }
    if (changedProperties.has('triggerType')) {
      this.activeTriggerOverride = undefined;
      this.userHasSentMessage = false;
    }
    // Push greet delay / enablement changes into the store and re-schedule timers
    const greetDelayProps = ['greetOpeningDelaySec', 'greetInputOpeningDelaySec', 'enableGreetWindow', 'enableInputCard'] as const;
    if (greetDelayProps.some(p => changedProperties.has(p))) {
      const gw = greetWindowStore.get();
      if (gw) {
        if (this.enableGreetWindow !== undefined) gw.enabled = this.enableGreetWindow;
        if (this.greetOpeningDelaySec !== undefined) gw.openingTimeAfterInitialLoadSec = this.greetOpeningDelaySec;
        if (gw.inputBox) {
          if (this.enableInputCard !== undefined) gw.inputBox.enabled = this.enableInputCard;
          if (this.greetInputOpeningDelaySec !== undefined) gw.inputBox.openingTimeAfterInitialLoadSec = this.greetInputOpeningDelaySec;
        }
        setupGreetTimers();
      }
    }
    if (changedProperties.has('prechatEnabled') || changedProperties.has('postchatEnabled')) {
      const fs = featuresStore.get();
      if (this.prechatEnabled !== undefined) fs.prechatEnabled = this.prechatEnabled;
      if (this.postchatEnabled !== undefined) fs.postchatEnabled = this.postchatEnabled;

      // Reset the chat session so the toggle takes effect immediately on the very next open
      const cs = chatStore.get();
      const cws = chatWindowStore.get();
      const welcomeEnabled = cws?.welcome?.enabled !== false;
      const wasOpen = this.panelOpen;

      // Close and reset state
      cs.panelOpen = false;
      cs.menuOpen = false;
      cs.attachOpen = false;
      cs.emojiOpen = false;
      cs.confirmBox = null;
      cs.state = welcomeEnabled ? 'welcome' : 'active';
      this.panelOpen = false;

      // If panel was open when user toggled, reopen immediately showing the new flow
      if (wasOpen) {
        requestAnimationFrame(() => {
          const isPrechat = featuresStore.get().prechatEnabled;
          cs.state = isPrechat ? 'prechat' : (welcomeEnabled ? 'welcome' : 'active');
          cs.panelOpen = true;
          this.panelOpen = true;
          this.requestUpdate();
        });
      }
    }
  }

  static styles = css`
    :host {
      display: block;
      font-family: inherit;
    }
  `;

  private registerLeafEvents() {
    const handlers = new Map<string, (e: CustomEvent) => void>([
      ['cw:toggle', () => this.handleToggleWidget()],
      ['cw:close-panel', () => this.handleCloseWidget()],
      ['cw:start-chat', () => {
        this.panelOpen = true;
        chatStore.get().panelOpen = true;
        chatStore.startFromWelcome(this.prechatEnabled);
        this.requestUpdate();
      }],
      ['cw:greet-dismiss', () => chatStore.dismissGreetWindow()],
      ['cw:greet-input', (e) => { chatStore.get().draft = e.detail; }],
      ['cw:greet-submit', (e) => {
        this.userHasSentMessage = true;
        this.handleGreetSubmit((e.detail as string) || '');
      }],
      ['cw:draft-change', (e) => { chatStore.get().draft = e.detail; }],
      ['cw:send', (e) => {
        this.userHasSentMessage = true;
        chatStore.send(e.detail as string);
      }],
      ['cw:toggle-attach', () => chatStore.toggleAttach()],
      ['cw:toggle-emoji', () => chatStore.toggleEmoji()],
      ['cw:attach-files', (e) => this.handleAttachFiles(e.detail as HTMLInputElement)],
      ['cw:send-cropped-image', (e) => {
        this.userHasSentMessage = true;
        chatStore.sendCroppedImage(e.detail as string);
      }],
      ['cw:capture-screenshot', () => chatStore.captureScreenshot()],
      ['cw:dismiss-consent', () => chatStore.dismissConsent()],
      ['cw:download-transcript', () => chatStore.downloadTranscript()],
      ['cw:toggle-sounds', () => chatStore.toggleSounds()],
      ['cw:insert-emoji', (e) => chatStore.insertEmoji(e.detail as string)],
      ['cw:submit-offline', (e) => {
        this.userHasSentMessage = true;
        if (e.detail) {
          chatStore.submitOfflinePayload(e.detail);
        } else {
          this.handleSubmitOffline();
        }
      }],
      ['cw:submit-prechat', (e) => {
        this.userHasSentMessage = true;
        this.panelOpen = true;
        chatStore.get().panelOpen = true;
        chatStore.submitPrechat(e.detail || {});
        this.requestUpdate();
      }],
      ['cw:submit-postchat', (e) => {
        this.panelOpen = false;
        chatStore.get().panelOpen = false;
        chatStore.submitPostchat(e.detail || {});
        this.requestUpdate();
      }],
      ['cw:start-new', () => chatStore.startNew()],
      ['cw:toggle-expand', () => chatStore.toggleExpand()],
      ['cw:open-menu', () => chatStore.toggleMenu()],
      ['cw:close-popups', () => chatStore.closePopups()],
      ['cw:end-chat', () => chatStore.askEndChat()],
      ['cw:confirm-end', () => chatStore.confirmEnd(this.postchatEnabled)],
      ['cw:confirm-cancel', () => chatStore.cancelEndChat()],
    ]);

    for (const [name, fn] of handlers) {
      const listener = ((e: Event) => fn(e as CustomEvent)) as EventListener;
      this.addEventListener(name, listener);
      this.eventListeners.push([name, listener]);
    }
  }

  private handleAttachFiles(input: HTMLInputElement) {
    if (input?.files?.length) {
      chatStore.uploadImage(input);
    }
  }

  private handleGreetSubmit(text: string) {
    this.panelOpen = true;
    chatStore.get().panelOpen = true;
    chatStore.startFromWelcome();
    if (text) {
      chatStore.get().draft = text;
      setTimeout(() => chatStore.send(), 0);
    }
    this.requestUpdate();
  }

  private handleSubmitOffline(d?: { name?: string; email?: string; message?: string }) {
    const s = chatStore.get();
    if (!s) return;
    if (!d) return chatStore.submitOffline();
    if (d.name !== undefined) s.offlineName = d.name;
    if (d.email !== undefined) s.offlineEmail = d.email;
    if (d.message !== undefined) s.offlineMessage = d.message;
    chatStore.submitOffline();
  }

  private handleKeydown(e: KeyboardEvent) {
    if (!this.panelOpen) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      const cs = chatStore.get();
      if (cs.confirmBox) {
        chatStore.cancelEndChat();
      } else {
        this.handleCloseWidget();
      }
      return;
    }

    if (e.key === 'Tab') {
      const focusables = this.collectFocusables();
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const path = e.composedPath();
      /* v8 ignore next -- composedPath() always returns at least the event target */
      const target = (path[0] as HTMLElement) || null;

      if (!path.includes(this)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && target === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && target === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  private collectFocusables(): HTMLElement[] {
    const sel = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const out: HTMLElement[] = [];
    const visit = (root: ShadowRoot) => {
      root.querySelectorAll<HTMLElement>('*').forEach((el) => {
        if (el.shadowRoot) visit(el.shadowRoot);
        if (el.matches(sel)) out.push(el);
      });
    };
    if (this.shadowRoot) visit(this.shadowRoot);
    return out;
  }

  private focusLauncher() {
    setTimeout(() => {
      const launcher = this.renderRoot?.querySelector<HTMLElement>('cw-bubble, cw-chatbar');
      (launcher as unknown as { focus?: () => void })?.focus?.();
    }, 60);
  }

  private checkCardToBarCollapse() {
    const cbs = chatbarStore.get();
    const currentTrigger = this.activeTriggerOverride || this.triggerType || (cbs?.enabled ? (cbs.layout === 'card' ? 'chatcard' : 'chatbar') : 'bubble');
    const hasVisitorMsg = this.userHasSentMessage || chatStore.get()?.messages?.some(m => m.senderType === 'VISITOR');
    if (hasVisitorMsg && currentTrigger === 'chatcard') {
      this.activeTriggerOverride = 'chatbar';
      /* v8 ignore next -- chatbarStore.get() always returns the singleton, so cbs is never null here */
      if (cbs) cbs.layout = 'bar';
    }
  }

  private handleToggleWidget() {
    this.panelOpen = !this.panelOpen;
    chatStore.get().panelOpen = this.panelOpen;
    if (this.panelOpen) {
      chatStore.get().unreadCount = 0;
    } else {
      this.checkCardToBarCollapse();
      this.focusLauncher();
    }
    this.requestUpdate();
  }

  private handleCloseWidget() {
    this.panelOpen = false;
    chatStore.get().panelOpen = false;
    this.checkCardToBarCollapse();
    this.focusLauncher();
    this.requestUpdate();
  }

  /**
   * Diagnostic inspector method. Automatically discovers all computed --cw-* CSS custom
   * properties, resolved effective configurations, active trigger mode, and host styles.
   */
  getDebugInfo() {
    const styles = typeof getComputedStyle !== 'undefined' ? getComputedStyle(this) : ({} as CSSStyleDeclaration);
    const cssVars: Record<string, string> = {};

    if (styles && typeof styles.length === 'number') {
      for (let i = 0; i < styles.length; i++) {
        const prop = styles[i];
        if (prop.startsWith('--cw-')) {
          cssVars[prop] = styles.getPropertyValue(prop).trim();
        }
      }
    }

    const KnownTokens = [
      '--cw-accent', '--cw-accent-deep', '--cw-accent-soft', '--cw-accent-tint',
      '--cw-surface', '--cw-bg', '--cw-ink', '--cw-muted', '--cw-border', '--cw-grad',
      '--cw-success', '--cw-warning', '--cw-error', '--cw-focus-ring', '--cw-font-family',
      '--cw-font-size-xs', '--cw-font-size-sm', '--cw-font-size-md', '--cw-font-size-lg',
      '--cw-font-size-xl', '--cw-font-size-2xl', '--cw-space-xs', '--cw-space-sm',
      '--cw-space-md', '--cw-space-lg', '--cw-radius-sm', '--cw-radius-md',
      '--cw-radius-lg', '--cw-radius-full'
    ];
    for (const token of KnownTokens) {
      const val = styles?.getPropertyValue ? styles.getPropertyValue(token).trim() : '';
      if (val) cssVars[token] = val;
    }

    const bs = bubbleStore.get();
    const cbs = chatbarStore.get();
    const gws = greetWindowStore.get();
    const cws = chatWindowStore.get();
    const fs = featuresStore.get();
    const cs = chatStore.get();

    const activeTrigger = this.activeTriggerOverride || this.triggerType || (cbs?.enabled ? (cbs.layout === 'card' ? 'chatcard' : 'chatbar') : 'bubble');
    const effectiveCbs = computeEffectiveChatbarConfig(this, cbs, activeTrigger, this.cachedTheme);
    const effectiveBs = computeEffectiveBubbleConfig(this, bs, this.cachedTheme);
    const activeOffsetBottom = activeTrigger === 'bubble' ? effectiveBs.offsetBottom : effectiveCbs.offsetBottom;
    const effectiveGws = computeEffectiveGreetWindowConfig(this, gws, this.cachedTheme);
    const effectiveCws = computeEffectiveChatWindowConfig(this, cws, activeOffsetBottom, this.cachedTheme);
    const effectiveFs = computeEffectiveFeaturesConfig(this, fs);

    return {
      activeTrigger,
      panelOpen: this.panelOpen,
      userHasSentMessage: this.userHasSentMessage,
      effectiveConfigs: {
        bubble: effectiveBs,
        chatbar: effectiveCbs,
        greetWindow: effectiveGws,
        chatWindow: effectiveCws,
        features: effectiveFs,
        chatState: cs,
      },
      cssVariables: cssVars,
      host: {
        width: styles?.width || '',
        height: styles?.height || '',
        position: styles?.position || '',
        display: styles?.display || '',
      },
    };
  }

  render() {
    if (!this.initialized) return html``;

    const bs = bubbleStore.get();
    const cbs = chatbarStore.get();
    const gws = greetWindowStore.get();
    const cws = chatWindowStore.get();
    const fs = featuresStore.get();
    const cs = chatStore.get();

    const activeTrigger = this.activeTriggerOverride || this.triggerType || (cbs.enabled ? (cbs.layout === 'card' ? 'chatcard' : 'chatbar') : 'bubble');

    const effectiveCbs = computeEffectiveChatbarConfig(this, cbs, activeTrigger, this.cachedTheme);
    const effectiveBs = computeEffectiveBubbleConfig(this, bs, this.cachedTheme);

    const activeOffsetBottom = activeTrigger === 'bubble'
      ? effectiveBs.offsetBottom
      : effectiveCbs.offsetBottom;

    const effectiveGws = computeEffectiveGreetWindowConfig(this, gws, this.cachedTheme);
    const effectiveCws = computeEffectiveChatWindowConfig(this, cws, activeOffsetBottom, this.cachedTheme);
    const effectiveFs = computeEffectiveFeaturesConfig(this, fs);

    return html`
      <cw-widget-layout
        .activeTrigger="${activeTrigger}"
        .bubbleConfig="${effectiveBs}"
        .chatbarConfig="${effectiveCbs}"
        .greetWindowConfig="${effectiveGws}"
        .chatWindowConfig="${effectiveCws}"
        .featuresConfig="${effectiveFs}"
        .chatState="${cs}"
        .panelOpen="${this.panelOpen}"
        .unreadCount="${cs?.unreadCount || 0}"
        .hasSentMessage="${cs?.hasSentMessage || false}"
        .rev="${this.rev}"
      ></cw-widget-layout>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cw-widget-root': CwWidgetRoot;
  }
}
