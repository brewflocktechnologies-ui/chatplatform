import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ChatWindowState, FeaturesState } from '../../store/types.js';
import { CORE_STYLES } from '../../styles/core-styles.js';
import '../molecules/cw-avatar.js';
import '../atoms/cw-icon.js';
import '../atoms/cw-button.js';

@customElement('cw-chat-header')
export class CwChatHeader extends LitElement {
  @property({ type: Object }) config?: ChatWindowState;
  @property({ type: Object }) features?: FeaturesState;
  @property({ type: Boolean }) isExpanded = false;
  @property({ type: String }) clientName = 'Support';
  @property({ type: String }) agentName = 'Sarah';
  @property({ type: String }) state = 'active';
  @property({ type: Number }) rev = 0;

  static styles = [
    CORE_STYLES,
    css`
      :host {
        display: block;
        width: 100%;
        flex-shrink: 0;
      }
      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        position: relative;
        box-sizing: border-box;
        flex-shrink: 0;
      }
      .left-section {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .expand-btn {
        display: flex;
        align-items: center;
        flex-shrink: 0;
      }
      @media (max-width: 480px) {
        .expand-btn {
          display: none !important;
        }
      }
      .info-col {
        display: flex;
        flex-direction: column;
        text-align: left;
        min-width: 0;
      }
      .title-text {
        font-weight: 700;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .subtitle-text {
        opacity: 0.95;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .actions-section {
        display: flex;
        gap: 4px;
        align-items: center;
        flex-shrink: 0;
      }
    `
  ];

  private emit(name: string) {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true }));
  }

  private toggleExpand() {
    this.emit('cw:toggle-expand');
  }

  private toggleMenu() {
    this.emit('cw:open-menu');
  }

  private closePanel() {
    this.emit('cw:close-panel');
  }

  private askEndChat() {
    this.emit('cw:end-chat');
  }

  render() {
    const cw = this.config || {};
    const welcomeEnabled = cw.welcome?.enabled !== false;
    const currentState = (this.state === 'welcome' && !welcomeEnabled) ? 'active' : (this.state || 'active');

    // In welcome mode, header is hidden
    if (currentState === 'welcome') return html``;

    const feats = this.features || {};
    const headerTextColor = cw.headerTextColor || '#ffffff';

    const showVoice = !!(feats.voiceCallEnabled ?? feats.voiceCallMaster ?? cw.features?.voiceCallEnabled ?? cw.features?.voiceCallMaster);
    const showVideo = !!(feats.videoCallEnabled ?? feats.videoCallMaster ?? cw.features?.videoCallEnabled ?? cw.features?.videoCallMaster);

    const showCloseSession = feats.closeChatVisitor || cw.features?.closeChatVisitor;

    const currentAgentName = this.agentName || cw.agentName || '';
    const currentClientName = this.clientName || cw.clientName || 'Support';

    const subtitleText = currentState === 'active'
      ? currentAgentName ? `${currentAgentName} · Online` : 'Online'
      : 'Online';

    return html`
      <header
        class="panel-header"
        style="background: ${cw.headerBg || 'var(--cw-grad, linear-gradient(135deg, var(--cw-accent, #0b5fff), color-mix(in srgb, var(--cw-accent, #0b5fff) 74%, #101828)))'}; color: ${headerTextColor}; padding: ${cw.headerPadding || '14px 16px'}; border-bottom: ${cw.headerBorderColor ? `1px solid ${cw.headerBorderColor}` : '1px solid rgba(0,0,0,0.08)'}"
      >
        <div class="left-section">
          ${cw.modernUi !== false
            ? html`
                <div class="expand-btn">
                  <cw-button
                    variant="icon"
                    size="xs"
                    .icon="${this.isExpanded ? 'Minimize2' : 'Maximize2'}"
                    .iconSize="${16}"
                    .color="${headerTextColor}"
                    .label="${this.isExpanded ? 'Collapse chat' : 'Expand chat'}"
                    @click="${this.toggleExpand}"
                  ></cw-button>
                </div>
              `
            : ''
          }

          <cw-avatar
            .name="${currentClientName}"
            .bg="${cw.headerAvatarBg || (headerTextColor === '#18181b' ? '#e4e4e7' : 'rgba(255,255,255,0.2)')}"
            .color="${cw.headerAvatarColor || headerTextColor}"
            .size="${32}"
            .activeDot="${cw.activeDot}"
          ></cw-avatar>

          <div class="info-col">
            <span class="title-text" style="font-size: ${cw.headerTitleFontSize || '14px'}">${currentClientName}</span>
            <span class="subtitle-text" style="font-size: ${cw.headerSubtitleFontSize || '11px'}">${subtitleText}</span>
          </div>
        </div>

        <div class="actions-section">
          ${showVoice
            ? html`
                <cw-button
                  variant="icon"
                  size="xs"
                  icon="Phone"
                  .iconSize="${17}"
                  .color="${headerTextColor}"
                  label="Start voice call"
                  @click="${() => this.emit('cw:voice-call')}"
                ></cw-button>
              `
            : ''
          }

          ${showVideo
            ? html`
                <cw-button
                  variant="icon"
                  size="xs"
                  icon="Video"
                  .iconSize="${18}"
                  .color="${headerTextColor}"
                  label="Start video call"
                  @click="${() => this.emit('cw:video-call')}"
                ></cw-button>
              `
            : ''
          }

          ${showCloseSession
            ? html`
                <cw-button
                  variant="icon"
                  size="xs"
                  icon="Power"
                  .iconSize="${18}"
                  .color="${headerTextColor}"
                  label="End chat session"
                  @click="${this.askEndChat}"
                ></cw-button>
              `
            : ''
          }

          ${cw.modernUi !== false
            ? html`
                <cw-button
                  variant="icon"
                  size="xs"
                  icon="MoreHorizontal"
                  .iconSize="${18}"
                  .color="${headerTextColor}"
                  label="Chat options"
                  @click="${this.toggleMenu}"
                ></cw-button>
              `
            : ''
          }

          <cw-button
            variant="icon"
            size="xs"
            icon="Close"
            .iconSize="${18}"
            .color="${headerTextColor}"
            label="Minimize chat panel"
            @click="${this.closePanel}"
          ></cw-button>
        </div>
      </header>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cw-chat-header': CwChatHeader;
  }
}
