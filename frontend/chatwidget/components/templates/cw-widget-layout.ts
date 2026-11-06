import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type {
  BubbleState,
  ChatbarState,
  GreetWindowState,
  ChatWindowState,
  FeaturesState,
  ChatState,
} from '../../store/types.js';
import { KEYFRAMES_CSS } from '../../tokens/design-tokens.js';
import '../organisms/cw-bubble.js';
import '../organisms/cw-chatbar.js';
import '../organisms/cw-greet-window.js';
import '../organisms/cw-chat-panel.js';

/**
 * cw-widget-layout
 * Structural layout template component for the chat widget surface.
 * Provides named slots (`trigger`, `greet`, `panel`), computes stacking geometry
 * and offsets for surface elements, and accepts activeTrigger as a prop.
 * Contains ZERO store dependencies.
 */
/** An offset the host actually set: not undefined, null or the empty string. */
const isSet = (value: unknown) => value !== undefined && value !== null && value !== '';

@customElement('cw-widget-layout')
export class CwWidgetLayout extends LitElement {
  @property({ type: String }) activeTrigger: 'bubble' | 'chatbar' | 'chatcard' = 'bubble';
  @property({ type: Object }) bubbleConfig?: Partial<BubbleState>;
  @property({ type: Object }) chatbarConfig?: Partial<ChatbarState>;
  @property({ type: Object }) greetWindowConfig?: Partial<GreetWindowState>;
  @property({ type: Object }) chatWindowConfig?: Partial<ChatWindowState>;
  @property({ type: Object }) featuresConfig?: Partial<FeaturesState>;
  @property({ type: Object }) chatState?: Partial<ChatState>;

  @property({ type: Boolean }) panelOpen = false;
  @property({ type: Number }) unreadCount = 0;
  @property({ type: Boolean }) hasSentMessage = false;
  @property({ type: Number }) rev = 0;

  render() {
    const bs = this.bubbleConfig || {};
    const cbs = this.chatbarConfig || {};
    const gws = this.greetWindowConfig || {};
    const cws = this.chatWindowConfig || {};
    const fs = this.featuresConfig || {};
    const cs = (this.chatState || {}) as ChatState;

    const isChatbarTrigger = this.activeTrigger === 'chatbar' || this.activeTrigger === 'chatcard';

    // -------------------------------------------------------------------------
    // 1. Calculate Trigger Geometry & Stacking Offsets
    // -------------------------------------------------------------------------
    const triggerBottom = Number(
      isChatbarTrigger
        ? (cbs.barOffsetBottom ?? cbs.offsetBottom ?? 12)
        : (bs.offsetBottom ?? 12)
    ) || 12;

    const chatbarRight = this.activeTrigger === 'chatcard' ? cbs.cardOffsetRight : cbs.barOffsetRight;
    const triggerRight = Number(
      isChatbarTrigger
        ? (chatbarRight ?? cbs.offsetRight ?? 16)
        : (bs.offsetRight ?? 16)
    ) || 16;

    const chatbarHeight = cbs.layout === 'card' ? 220 : 40;
    const triggerHeight = isChatbarTrigger
      ? (cbs.height || chatbarHeight)
      : (bs.height || 60);

    // -------------------------------------------------------------------------
    // 2. Greet Window Stacking Math
    // -------------------------------------------------------------------------
    const greetSpacing = gws.spacing ?? 16;
    const greetBottomPx = triggerBottom + triggerHeight + greetSpacing;
    const greetRightPx = triggerRight;
    const greetMaxHeightPx = `calc(100% - ${(greetBottomPx + 24)}px)`;

    // -------------------------------------------------------------------------
    // 3. Panel Stacking Math
    // -------------------------------------------------------------------------
    const rawPanelBottom = isSet(cws.offsetBottom) ? Number(cws.offsetBottom) : triggerBottom;
    const panelDefaultBottom = Number.isNaN(rawPanelBottom) ? triggerBottom : rawPanelBottom;

    // The panel sits above the trigger unless the open panel hides the trigger.
    const trigger = isChatbarTrigger ? cbs : bs;
    let panelBottomPx: number = panelDefaultBottom;
    if (trigger && !trigger.hideOnOpen) {
      panelBottomPx = panelDefaultBottom + triggerHeight + (trigger.stackGap ?? 12);
    }

    const panelRightPx = isSet(cws.offsetRight) ? Number(cws.offsetRight) : 16;

    const panelMaxHeightPx = `calc(100% - ${(panelBottomPx + 24)}px)`;

    return html`
      <style>
        ${KEYFRAMES_CSS}
        :host {
          display: block;
        }
      </style>

      <!-- SLOTTED OR DEFAULT TRIGGER -->
      <slot name="trigger">
        ${isChatbarTrigger
          ? html`
              <cw-chatbar
                .config="${cbs}"
                .panelOpen="${this.panelOpen}"
                .unreadCount="${this.unreadCount}"
                .rev="${this.rev}"
              ></cw-chatbar>
            `
          : html`
              <cw-bubble
                .config="${bs}"
                .panelOpen="${this.panelOpen}"
                .unreadCount="${this.unreadCount}"
                .hasSentMessage="${this.hasSentMessage}"
                .rev="${this.rev}"
              ></cw-bubble>
            `
        }
      </slot>

      <!-- SLOTTED OR DEFAULT GREET WINDOW -->
      <slot name="greet">
        <cw-greet-window
          .config="${gws}"
          .chatbarConfig="${cbs}"
          .bubbleConfig="${bs}"
          .panelOpen="${this.panelOpen}"
          .hasSentMessage="${this.hasSentMessage}"
          .visible="${gws.visible}"
          .dismissed="${gws.dismissed}"
          .bottomPx="${greetBottomPx}"
          .rightPx="${greetRightPx}"
          .maxHeightPx="${greetMaxHeightPx}"
          .rev="${this.rev}"
        ></cw-greet-window>
      </slot>

      <!-- SLOTTED OR DEFAULT CHAT PANEL -->
      <slot name="panel">
        <cw-chat-panel
          .chatWindowConfig="${cws}"
          .chatState="${cs}"
          .features="${fs}"
          .chatbarConfig="${cbs}"
          .bubbleConfig="${bs}"
          .panelOpen="${this.panelOpen}"
          .bottomPx="${panelBottomPx}"
          .rightPx="${panelRightPx}"
          .maxHeightPx="${panelMaxHeightPx}"
          .rev="${this.rev}"
        ></cw-chat-panel>
      </slot>

      <!-- DEFAULT UNNAMED SLOT -->
      <slot></slot>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cw-widget-layout': CwWidgetLayout;
  }
}
