import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Message, ChatWindowState } from '../../store/types.js';
import { CORE_STYLES } from '../../styles/core-styles.js';
import '../atoms/cw-icon.js';
import './cw-avatar.js';

type BubbleLook = {
  bg: string;
  color: string;
  borderColor: string;
  boxShadow: string;
  borderRadius: string;
  padding: string;
  fontSize: string;
};

/** Visitor and agent bubbles differ only in which config keys they read and their defaults. */
function bubbleLook(isVisitor: boolean, cw: Partial<ChatWindowState>): BubbleLook {
  if (isVisitor) {
    return {
      bg: cw.visitorBubbleBg || 'linear-gradient(135deg, var(--cw-accent, #0b5fff), #22d3ee)',
      color: cw.visitorBubbleColor || '#ffffff',
      borderColor: 'transparent',
      // A custom background brings its own look, so the default glow is dropped.
      boxShadow: cw.visitorBubbleBg ? 'none' : '0 2px 8px rgba(11, 95, 255, 0.2)',
      borderRadius: cw.visitorBubbleBorderRadius || '16px',
      padding: cw.visitorBubblePadding || '10px 14px',
      fontSize: cw.visitorBubbleFontSize || '14px',
    };
  }
  return {
    bg: cw.agentBubbleBg || '#ffffff',
    color: cw.agentBubbleColor || 'var(--cw-ink, #101828)',
    borderColor: cw.agentBubbleBorderColor || 'var(--cw-border, #e9ecf1)',
    boxShadow: cw.agentBubbleBoxShadow || '0 1px 3px rgba(0, 0, 0, 0.08)',
    borderRadius: cw.agentBubbleBorderRadius || '16px',
    padding: cw.agentBubblePadding || '10px 14px',
    fontSize: cw.agentBubbleFontSize || '14px',
  };
}

const CLOCK_TIME = /^\d{1,2}:\d{2}(:\d{2})?(\s*[AP]M)?$/i;
const SHORT_TIME: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

/** Shows a clock time as-is, formats a date string as a time, and falls back to the raw text. */
function formatMessageTime(raw?: string): string {
  if (!raw) return new Date().toLocaleTimeString([], SHORT_TIME);
  const str = String(raw).trim();
  if (CLOCK_TIME.test(str)) return str;
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? str : d.toLocaleTimeString([], SHORT_TIME);
}

/** Delivery tick: one check while sending/sent, two once delivered, coloured and brighter when read. */
function tickLook(m: Message, readColor: string, sentColor: string) {
  const isRead = m.status === 'read';
  const isSent = m.status === 'sent' || !!m.pending;
  return {
    name: !isRead && isSent ? 'Check' : 'DoubleCheck',
    size: isSent ? 13 : 14,
    color: isRead ? readColor : sentColor,
    opacity: isRead ? 1 : 0.75,
  };
}

@customElement('cw-message-bubble')
export class CwMessageBubble extends LitElement {
  @property({ type: Object }) message!: Message;
  @property({ type: Object }) chatWindowConfig?: ChatWindowState;
  @property({ type: Boolean }) isGroupEnd = true;
  @property({ type: Boolean }) isGroupStart = true;
  @property({ type: String }) agentName = '';

  static readonly styles = [
    CORE_STYLES,
    css`
      :host {
        display: block;
        width: 100%;
        margin-bottom: 4px;
        font-family: inherit, system-ui, -apple-system, sans-serif;
      }
      .bubble-row {
        display: flex;
        gap: 8px;
        align-items: flex-end;
        width: 100%;
      }
      .bubble-row.from-visitor {
        justify-content: flex-end;
      }
      .bubble-row.from-agent {
        justify-content: flex-start;
        padding-left: 0;
      }
      .msg-avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 700;
        flex-shrink: 0;
        overflow: hidden;
        background-color: var(--cw-accent, #0b5fff);
        color: #ffffff;
      }
      .msg-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .msg-avatar-placeholder {
        width: 28px;
        height: 28px;
        flex-shrink: 0;
      }
      .bubble {
        max-width: 75%;
        word-break: break-word;
        line-height: 1.4;
        position: relative;
        box-sizing: border-box;
      }
      .bubble.pending {
        opacity: 0.7;
      }
      .bubble-img {
        max-width: 100%;
        border-radius: 12px;
        cursor: pointer;
        display: block;
        margin-bottom: 4px;
      }
      .bubble-time {
        font-size: 10px;
        opacity: 0.75;
        display: inline-flex;
        align-items: center;
        float: right;
        margin-left: 8px;
        margin-top: 4px;
      }
    `
  ];

  private renderAvatarSlot(m: Message, cw: Partial<ChatWindowState>) {
    if (m.senderType !== 'AGENT') return '';
    if (!this.isGroupEnd) return html`<div class="msg-avatar-placeholder"></div>`;
    return html`
      <cw-avatar
        .src="${cw.agentAvatarUrl || ''}"
        .name="${m.senderName || this.agentName || 'Agent'}"
        .size="${28}"
        .bgColor="${cw.agentAvatarBg || 'var(--cw-accent, #0b5fff)'}"
        .textColor="${cw.agentAvatarColor || '#ffffff'}"
        .showOnline="${false}"
      ></cw-avatar>
    `;
  }

  private renderAttachment(m: Message) {
    if (!m.attachment && !m.localUrl) return '';
    return html`
      <img
        class="bubble-img"
        alt="attachment"
        src="${m.localUrl || m.url || ''}"
        @click="${() => !m.pending && window.open(m.localUrl || m.url || '', '_blank')}"
      />
    `;
  }

  private renderTime(m: Message, cw: Partial<ChatWindowState>, isVisitor: boolean) {
    if (!this.isGroupEnd) return '';
    const showTicks = isVisitor && cw.ticksEnabled !== false;
    const tick = tickLook(m, cw.readTickColor || '#34b7f1', cw.sentTickColor || 'currentColor');
    return html`
      <span class="bubble-time">
        ${formatMessageTime(m.created)}
        ${showTicks
          ? html`
              &nbsp;<cw-icon
                .name="${tick.name}"
                .size="${tick.size}"
                .color="${tick.color}"
                style="opacity: ${tick.opacity}; vertical-align: middle; margin-left: 2px;"
              ></cw-icon>
            `
          : ''
        }
      </span>
    `;
  }

  render() {
    if (!this.message) return html``;

    const m = this.message;
    const cw = this.chatWindowConfig || {};
    const isVisitor = m.senderType === 'VISITOR';
    const look = bubbleLook(isVisitor, cw);

    return html`
      <div class="bubble-row ${isVisitor ? 'from-visitor' : 'from-agent'}">
        ${this.renderAvatarSlot(m, cw)}

        <div
          class="bubble ${m.pending ? 'pending' : ''}"
          style="background: ${look.bg}; color: ${look.color}; border-color: ${look.borderColor}; border-style: solid; border-width: ${isVisitor ? '0px' : '1px'}; box-shadow: ${look.boxShadow}; border-radius: ${look.borderRadius}; padding: ${look.padding}; font-size: ${look.fontSize}"
        >
          ${this.renderAttachment(m)}

          ${m.body ? html`<span>${m.body}</span>` : ''}

          ${this.renderTime(m, cw, isVisitor)}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cw-message-bubble': CwMessageBubble;
  }
}
