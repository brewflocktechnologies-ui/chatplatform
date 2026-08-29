import { LitElement, html, css, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ChatWindowState, ChatState, FeaturesState, ChatbarState, BubbleState } from '../../store/types.js';
import { CORE_STYLES } from '../../styles/core-styles.js';
import { REDUCED_MOTION_CSS } from '../../tokens/accessibility.js';
import { EnterLeaveController } from '../../utils/transition.js';
import './cw-chat-header.js';
import './cw-chat-body.js';
import '../molecules/cw-confirm-dialog.js';
import type { CwChatBody } from './cw-chat-body.js';

@customElement('cw-chat-panel')
export class CwChatPanel extends LitElement {
  @property({ type: Object }) chatWindowConfig?: ChatWindowState;
  @property({ type: Object }) chatState?: ChatState;
  @property({ type: Object }) features?: FeaturesState;
  @property({ type: Object }) chatbarConfig?: ChatbarState;
  @property({ type: Object }) bubbleConfig?: BubbleState;
  @property({ type: Boolean }) panelOpen = false;
  @property({ type: Number }) rev = 0;
  @property({ type: Number }) bottomPx?: number;
  @property({ type: Number }) rightPx?: number;
  @property({ type: String }) maxHeightPx?: string;
  /** When true (default) the panel is fixed to the viewport; set false to position it inside a container (used by stories). */
  @property({ type: Boolean }) fixed = true;

  private transition = new EnterLeaveController(this, {
    enterMs: () => (this.chatWindowConfig?.animationOpeningSec !== undefined ? this.chatWindowConfig.animationOpeningSec : 0.3) * 1000,
    leaveMs: () => (this.chatWindowConfig?.animationClosingSec !== undefined ? this.chatWindowConfig.animationClosingSec : 0.2) * 1000,
  });

  /** Guards "focus on open" so it runs once per open instead of every render. */
  private didFocus = false;

  static styles = [
    CORE_STYLES,
    REDUCED_MOTION_CSS,
    css`
      :host {
        display: block;
      }
      .panel-wrapper {
        position: fixed;
        z-index: 50;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        pointer-events: auto;
        transform-origin: bottom right;
        transition: all 0.3s ease;
        max-width: calc(100% - 24px);
      }
      @media (max-width: 480px) {
        .panel-wrapper {
          position: fixed !important;
          top: 0 !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          height: 100dvh !important;
          max-width: 100vw !important;
          max-height: 100vh !important;
          max-height: 100dvh !important;
          margin: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }
        .panel {
          border-radius: 0 !important;
          border: none !important;
          width: 100% !important;
          height: 100% !important;
        }
      }
      .panel {
        display: flex;
        flex-direction: column;
        position: relative;
        width: 100%;
        height: 100%;
        max-width: 100%;
        max-height: 100%;
        overflow: hidden;
        box-sizing: border-box;
        isolation: isolate;
        transform: translateZ(0);
      }
      .modal-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
    `
  ];

  private emit(name: string) {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true }));
  }

  protected willUpdate(_changed: PropertyValues<this>) {
    super.willUpdate(_changed);
    this.transition.setTarget(!!this.panelOpen);
  }

  protected updated(_changed: PropertyValues<this>) {
    super.updated(_changed);
    if (this.panelOpen) {
      // Only move focus once per open, after the enter transition finishes.
      if (this.transition.phase === 'open' && !this.didFocus) {
        this.didFocus = true;
        this.focusOnOpen();
      }
    } else {
      this.didFocus = false;
    }
  }

  /** Moves focus into the dialog (composer for active chats, panel otherwise). */
  private focusOnOpen() {
    const panel = this.shadowRoot?.querySelector<HTMLElement>('.panel');
    panel?.focus();
    if (this.chatState?.state === 'active') {
      setTimeout(() => {
        const body = this.renderRoot?.querySelector<CwChatBody>('cw-chat-body');
        body?.focusInput?.();
      }, 60);
    }
  }

  render() {
    const cw = this.chatWindowConfig;
    const cs = this.chatState;
    const feats = this.features || {};
    const cb = this.chatbarConfig;
    const bb = this.bubbleConfig;

    if (!this.transition.render || !cw || !cs) return html``;

    const phase = this.transition.phase;
    const isLeaving = phase === 'leave';
    const isHidden = phase === 'enter' || phase === 'leave';
    const openingSec = cw.animationOpeningSec !== undefined ? cw.animationOpeningSec : 0.3;
    const closingSec = cw.animationClosingSec !== undefined ? cw.animationClosingSec : 0.2;
    const durationSec = isLeaving ? closingSec : openingSec;

    const isExpanded = cs.isExpanded;
    const widthVal = isExpanded
      ? cw.expandedWidth || 480
      : cw.widgetWidth || 350;

    const heightVal = cw.widgetHeight || 550;

    const bottomPx = this.bottomPx ?? 12;

    const rightPx = this.rightPx ?? 16;

    const shadow = cw.widgetShadow
      ? `0 8px ${cw.widgetShadowBlur || 30}px ${cw.widgetShadowColor || 'rgba(0,0,0,0.12)'}`
      : 'none';

    const border = cw.widgetBorderEnabled
      ? `${cw.widgetBorderWidth || 1}px solid ${cw.widgetBorderColor || 'var(--cw-border, #e9ecf1)'}`
      : 'none';

    const borderRadius = `${cw.widgetBorderRadius || 24}px`;
    const maxHeightPx = this.maxHeightPx || `calc(100% - ${(bottomPx + 24)}px)`;

    return html`
      <div
        class="panel-wrapper zotly-widget-panel-wrapper"
        style="position: ${this.fixed ? 'fixed' : 'absolute'}; width: ${widthVal}px; height: ${heightVal}px; max-width: calc(100% - 24px); max-height: ${maxHeightPx}; bottom: ${bottomPx}px; right: ${rightPx}px; opacity: ${isHidden ? '0' : '1'}; transform: ${isHidden ? 'scale(0.5) translateY(32px)' : 'scale(1) translateY(0)'}; transform-origin: bottom right; transition: opacity ${durationSec}s ease, transform ${durationSec}s ease"
      >
        <div
          class="panel"
          role="dialog"
          aria-modal="${this.panelOpen ? 'true' : 'false'}"
          aria-label="Chat window"
          tabindex="-1"
          style="box-shadow: ${shadow}; border: ${border}; border-radius: ${borderRadius}; background: ${cw.bodyBg || 'var(--cw-bg, #f6f7fa)'}; --cw-accent: ${cw.accentColor || '#0b5fff'}"
        >
          <!-- HEADER -->
          <cw-chat-header
            .config="${cw}"
            .features="${feats}"
            .isExpanded="${isExpanded}"
            .clientName="${cs.clientName}"
            .agentName="${cs.agentName}"
            .state="${cs.state}"
            .rev="${this.rev}"
          ></cw-chat-header>

          <!-- BODY -->
          <cw-chat-body .chatState="${cs}" .chatWindowConfig="${cw}" .rev="${this.rev}"></cw-chat-body>

          <!-- RECONNECTING BANNER -->
          ${cs.reconnecting
            ? html`<div class="reconnecting">Reconnecting…</div>`
            : ''
          }

          <!-- CONFIRM MODAL OVERLAY -->
          ${cs.confirmBox
            ? html`
                <cw-confirm-dialog
                  .message="${cs.confirmBox.message}"
                  .cancelLabel="${cs.confirmBox.cancelLabel || 'Cancel'}"
                  .confirmLabel="${cs.confirmBox.confirmLabel || 'Confirm'}"
                  .modalCardBg="${cw.modalCardBg || '#ffffff'}"
                  .modalMessageColor="${cw.modalMessageColor || 'var(--cw-ink, #101828)'}"
                  .modalBorderRadius="${cw.modalBorderRadius !== undefined ? cw.modalBorderRadius : 16}"
                  .cancelBg="${cw.endChatCancelBg || 'var(--cw-surface, #ffffff)'}"
                  .cancelTextColor="${cw.endChatCancelTextColor || 'var(--cw-muted, #667085)'}"
                  .cancelBorderColor="${cw.endChatCancelBorderColor || 'var(--cw-border, #e9ecf1)'}"
                  .confirmBg="${cw.endChatConfirmBg || 'var(--cw-accent, #0b5fff)'}"
                  .confirmTextColor="${cw.endChatConfirmTextColor || '#ffffff'}"
                ></cw-confirm-dialog>
              `
            : ''
          }
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cw-chat-panel': CwChatPanel;
  }
}
