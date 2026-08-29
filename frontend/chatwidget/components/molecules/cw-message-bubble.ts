import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Message, ChatWindowState } from '../../store/types.js';
import { CORE_STYLES } from '../../styles/core-styles.js';
import '../atoms/cw-icon.js';
import './cw-avatar.js';

@customElement('cw-message-bubble')
export class CwMessageBubble extends LitElement {
  @property({ type: Object }) message!: Message;
  @property({ type: Object }) chatWindowConfig?: ChatWindowState;
  @property({ type: Boolean }) isGroupEnd = true;
  @property({ type: Boolean }) isGroupStart = true;
  @property({ type: String }) agentName = '';

  static styles = [
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

  render() {
    if (!this.message) return html``;

    const m = this.message;
    const cw = this.chatWindowConfig || {};
    const isVisitor = m.senderType === 'VISITOR';
    const isAgent = m.senderType === 'AGENT';

    const bg = isVisitor
      ? cw.visitorBubbleBg || 'linear-gradient(135deg, var(--cw-accent, #0b5fff), #22d3ee)'
      : cw.agentBubbleBg || '#ffffff';

    const color = isVisitor
      ? cw.visitorBubbleColor || '#ffffff'
      : cw.agentBubbleColor || 'var(--cw-ink, #101828)';

    const borderColor = isVisitor
      ? 'transparent'
      : cw.agentBubbleBorderColor || 'var(--cw-border, #e9ecf1)';

    const boxShadow = isVisitor
      ? cw.visitorBubbleBg ? 'none' : '0 2px 8px rgba(11, 95, 255, 0.2)'
      : cw.agentBubbleBoxShadow || '0 1px 3px rgba(0, 0, 0, 0.08)';

    const borderRadius = isVisitor
      ? cw.visitorBubbleBorderRadius || '16px'
      : cw.agentBubbleBorderRadius || '16px';

    const padding = isVisitor
      ? cw.visitorBubblePadding || '10px 14px'
      : cw.agentBubblePadding || '10px 14px';

    const fontSize = isVisitor
      ? cw.visitorBubbleFontSize || '14px'
      : cw.agentBubbleFontSize || '14px';

    const avatarBg = cw.agentAvatarBg || 'var(--cw-accent, #0b5fff)';
    const avatarColor = cw.agentAvatarColor || '#ffffff';

    const formattedTime = m.created
      ? new Date(m.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const avatarInitial = (m.senderName || this.agentName || 'A').charAt(0).toUpperCase();

    const showTicks = cw.ticksEnabled !== false;
    const sentTickColor = cw.sentTickColor || 'currentColor';
    const readTickColor = cw.readTickColor || '#34b7f1';

    return html`
      <div class="bubble-row ${isVisitor ? 'from-visitor' : 'from-agent'}">
        ${isAgent && this.isGroupEnd
          ? html`
              <cw-avatar
                .src="${cw.agentAvatarUrl || ''}"
                .name="${m.senderName || this.agentName || 'Agent'}"
                .size="${28}"
                .bgColor="${avatarBg}"
                .textColor="${avatarColor}"
                .showOnline="${false}"
              ></cw-avatar>
            `
          : isAgent
          ? html`<div class="msg-avatar-placeholder"></div>`
          : ''
        }

        <div
          class="bubble ${m.pending ? 'pending' : ''}"
          style="background: ${bg}; color: ${color}; border-color: ${borderColor}; border-style: solid; border-width: ${isVisitor ? '0px' : '1px'}; box-shadow: ${boxShadow}; border-radius: ${borderRadius}; padding: ${padding}; font-size: ${fontSize}"
        >
          ${m.attachment || m.localUrl
            ? html`
                <img
                  class="bubble-img"
                  alt="attachment"
                  src="${m.localUrl || m.url || ''}"
                  @click="${() => !m.pending && window.open(m.localUrl || m.url || '', '_blank')}"
                />
              `
            : ''
          }

          ${m.body ? html`<span>${m.body}</span>` : ''}

          ${this.isGroupEnd
            ? html`
                <span class="bubble-time">
                  ${formattedTime}
                  ${isVisitor && showTicks
                    ? html`
                        &nbsp;<cw-icon
                          .name="${m.status === 'read' ? 'DoubleCheck' : m.status === 'sent' || m.pending ? 'Check' : 'DoubleCheck'}"
                          .size="${m.status === 'sent' || m.pending ? 13 : 14}"
                          .color="${m.status === 'read' ? readTickColor : sentTickColor}"
                          style="opacity: ${m.status === 'read' ? 1 : 0.75}; vertical-align: middle; margin-left: 2px;"
                        ></cw-icon>
                      `
                    : ''
                  }
                </span>
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
    'cw-message-bubble': CwMessageBubble;
  }
}
