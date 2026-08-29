import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { ChatState, ChatWindowState, Message } from '../../store/types.js';
import { CORE_STYLES } from '../../styles/core-styles.js';
import { REDUCED_MOTION_CSS } from '../../tokens/accessibility.js';
import './cw-welcome-card.js';
import './cw-chat-form.js';
import '../molecules/cw-message-bubble.js';
import '../molecules/cw-composer.js';
import '../molecules/cw-chat-footer.js';
import '../molecules/cw-emoji-picker.js';
import '../molecules/cw-attach-menu.js';
import '../molecules/cw-chat-menu.js';
import './cw-image-cropper.js';
import '../atoms/cw-typing-dots.js';
import '../atoms/cw-icon.js';
import { PRECHAT_SCHEMA, OFFLINE_SCHEMA, POSTCHAT_SCHEMA } from '../../config/form-schemas.js';
import type { CwComposer } from '../molecules/cw-composer.js';

/**
 * cw-chat-body
 * Pure presentational organism. Reads state via props and pushes ALL user
 * actions up as composed CustomEvents (`cw:*`). Never touches the store.
 * A `rev` (revision) prop from the container guarantees re-render when the
 * store mutates config objects in place.
 */
@customElement('cw-chat-body')
export class CwChatBody extends LitElement {
  @property({ type: Object }) chatState!: ChatState;
  @property({ type: Object }) chatWindowConfig!: ChatWindowState;
  @property({ type: Number }) rev = 0;

  @state() private offlineName = '';
  @state() private offlineEmail = '';
  @state() private offlineMessage = '';
  @state() private cropperOpen = false;
  @state() private pendingImageSrc = '';

  private lastCount = -1;

  static styles = [
    CORE_STYLES,
    REDUCED_MOTION_CSS,
    css`
      :host {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        position: relative;
        overflow: hidden;
      }
      .panel-body {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        position: relative;
        overflow: hidden;
      }
      .messages-area {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        scroll-behavior: smooth;
      }
      .messages-area:focus {
        outline: none;
      }
      .messages-area:focus-visible {
        outline: 2px solid var(--cw-accent, #0b5fff);
        outline-offset: -2px;
      }
      .day-divider {
        text-align: center;
        font-size: 11px;
        color: var(--cw-muted, #667085);
        margin: 12px 0 8px 0;
        position: relative;
      }
      .center-note {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        gap: 12px;
        color: var(--cw-muted, #667085);
      }
      .spinner {
        width: 24px;
        height: 24px;
        border: 2px solid currentColor;
        border-top-color: transparent;
        border-radius: 50%;
        animation: zotly-spin 1s linear infinite;
      }
      .muted {
        margin: 0;
        font-size: 13px;
        color: var(--cw-muted, #667085);
      }
      .queued {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 24px;
        text-align: center;
      }
      .ticket {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }
      .ticket-number {
        font-size: 48px;
        font-weight: 800;
        color: var(--cw-accent, #0b5fff);
      }
      .ticket-label {
        font-size: 14px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .done-check {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: rgba(34, 197, 94, 0.1);
        color: var(--cw-success, #10b981);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .consent {
        padding: 8px 16px;
        background: var(--cw-surface, #ffffff);
        border-top: 1px solid var(--cw-border, #e9ecf1);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        font-size: 11px;
        color: var(--cw-muted, #667085);
      }
      .consent p {
        margin: 0;
      }
      .consent-x {
        border: none;
        background: transparent;
        cursor: pointer;
        color: var(--cw-muted, #667085);
        font-size: 12px;
      }
      .closed-note {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 24px;
        text-align: center;
      }
      .closed-note p {
        margin: 0;
        font-weight: 600;
      }
      .closed-note button.primary {
        padding: 10px 20px;
        border-radius: 9999px;
        border: none;
        background: var(--cw-accent, #0b5fff);
        color: #ffffff;
        font-weight: 700;
        cursor: pointer;
      }

      @keyframes zotly-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `
  ];

  private emit(name: string, detail?: unknown) {
    this.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true, composed: true })
    );
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('rev') && this.chatState) {
      const count = this.chatState.messages?.length || 0;
      if (count !== this.lastCount) {
        this.lastCount = count;
        this.scrollToBottom();
      }
    }
  }

  private scrollToBottom() {
    setTimeout(() => {
      const el = this.shadowRoot?.querySelector('.messages-area');
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }

  private flag(key: string, def = true): boolean {
    const f = this.chatState?.flags || {};
    return f[key] !== undefined ? f[key] : def;
  }

  private groupStart(i: number, msgs: Message[]): boolean {
    return i === 0 || msgs[i].senderType !== msgs[i - 1].senderType;
  }

  private groupEnd(i: number, msgs: Message[]): boolean {
    return i === msgs.length - 1 || msgs[i].senderType !== msgs[i + 1].senderType;
  }

  private handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        this.pendingImageSrc = evt.target?.result as string;
        this.cropperOpen = true;
      };
      reader.readAsDataURL(file);
    } else {
      this.emit('cw:attach-files', e.target);
    }
  }

  private openFileSelector() {
    const input = this.shadowRoot?.querySelector<HTMLInputElement>('#cw-file-input');
    if (input) {
      input.click();
    }
  }

  /** Delegates focus to the composer (used by the panel when the chat opens). */
  focusInput() {
    const composer = this.renderRoot?.querySelector<CwComposer>('cw-composer');
    composer?.focusInput?.();
  }

  render() {
    const cs = this.chatState;
    const cw = this.chatWindowConfig;

    if (!cs || !cw) return html``;

    const welcomeEnabled = cw.welcome?.enabled !== false;
    const isWelcome = cs.state === 'welcome' && welcomeEnabled;
    const isBoot = cs.state === 'boot';
    const isPrechat = cs.state === 'prechat';
    const isOffline = cs.state === 'offline';
    const isOfflineSent = cs.state === 'offline-sent';
    const isQueued = cs.state === 'queued';
    const isActive = cs.state === 'active' || (cs.state === 'welcome' && !welcomeEnabled);
    const isPostchat = cs.state === 'postchat';
    const isClosed = cs.state === 'closed';

    const msgs = cs.messages || [];

    return html`
      <div
        class="panel-body"
        style="background: ${isWelcome ? cw.welcome?.bgGradient || 'linear-gradient(135deg, var(--cw-accent, #0b5fff), #22d3ee)' : cw.bodyBg || 'var(--cw-bg, #f6f7fa)'}; padding: ${isWelcome ? '0px' : ''}; ${isWelcome ? 'height: 100%; max-height: 100%; overflow: hidden;' : ''}"
      >
        <!-- WELCOME SCREEN -->
        ${isWelcome
          ? html`<cw-welcome-card .config="${cw.welcome}" .accentColor="${cw.accentColor}"></cw-welcome-card>`
          : ''
        }

        <!-- BOOT / CONNECTING -->
        ${isBoot
          ? html`
              <div class="center-note">
                <div class="spinner"></div>
                <p>Connecting…</p>
              </div>
            `
          : ''
        }

        <!-- PRECHAT FORM -->
        ${isPrechat
          ? html`
              <cw-chat-form
                .schema="${PRECHAT_SCHEMA}"
                .values="${{ name: cs.offlineName || '', email: cs.offlineEmail || '' }}"
                @cw:form-submit="${(e: CustomEvent) => this.emit('cw:submit-prechat', e.detail.values)}"
              ></cw-chat-form>
            `
          : ''
        }

        <!-- OFFLINE FORM -->
        ${isOffline
          ? html`
              <cw-chat-form
                .schema="${OFFLINE_SCHEMA}"
                .values="${{ name: cs.offlineName || '', email: cs.offlineEmail || '', message: cs.offlineMessage || '' }}"
                .submitting="${cs.offlineSending}"
                @cw:form-submit="${(e: CustomEvent) => this.emit('cw:submit-offline', e.detail.values)}"
              ></cw-chat-form>
            `
          : ''
        }

        <!-- POSTCHAT FORM -->
        ${isPostchat
          ? html`
              <cw-chat-form
                .schema="${POSTCHAT_SCHEMA}"
                @cw:form-submit="${(e: CustomEvent) => this.emit('cw:submit-postchat', e.detail.values)}"
              ></cw-chat-form>
            `
          : ''
        }

        <!-- OFFLINE SENT CONFIRMATION -->
        ${isOfflineSent
          ? html`
              <div class="queued">
                <div class="ticket offline-done">
                  <div class="done-check">
                    <cw-icon .name="${'Check'}" .size="${30}"></cw-icon>
                  </div>
                  <h2>Message received</h2>
                  <p class="muted">
                    Thanks${this.offlineName ? `, ${this.offlineName}` : ''}! We've saved your message and will reply to <strong>${this.offlineEmail}</strong> as soon as an agent is back.
                  </p>
                </div>
              </div>
            `
          : ''
        }

        <!-- QUEUED STATE -->
        ${isQueued
          ? html`
              <div class="queued">
                <div class="ticket">
                  <div class="ticket-number">${cs.position}</div>
                  <div class="ticket-label">in line</div>
                  <p class="muted">An agent will be with you shortly.</p>
                </div>
              </div>
            `
          : ''
        }

        <!-- ACTIVE CHAT / CLOSED MESSAGES -->
        ${isActive || isClosed
          ? html`
              <div class="messages-area" tabindex="0" role="log" aria-label="Message history" aria-live="polite" aria-relevant="additions" style="background: ${cw.bodyBg || 'var(--cw-bg, #f6f7fa)'}">
                <input
                  type="file"
                  id="cw-file-input"
                  aria-label="Upload photo"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  style="display: none"
                  @change="${this.handleFileSelect}"
                />
                ${msgs.map((m, i) => {
                  const showDivider = i === 0;
                  const isGroupEnd = this.groupEnd(i, msgs);
                  const isGroupStart = this.groupStart(i, msgs);

                  return html`
                    ${showDivider ? html`<div class="day-divider">Today</div>` : ''}

                    <cw-message-bubble
                      .message="${m}"
                      .chatWindowConfig="${cw}"
                      .isGroupEnd="${isGroupEnd}"
                      .isGroupStart="${isGroupStart}"
                      .agentName="${cs.agentName}"
                    ></cw-message-bubble>
                  `;
                })}

                ${cs.typingName && (cw.typingIndicator !== false)
                  ? html`
                      <div class="bubble-row from-agent g-start g-end" style="margin-top: 4px">
                        <div class="bubble typing-bubble">
                          <span class="sr-only">${cs.typingName} is typing</span>
                          <span class="typing-dots"><cw-typing-dots></cw-typing-dots></span>
                        </div>
                      </div>
                    `
                  : ''
                }
              </div>

              <!-- CONSENT BANNER -->
              ${isActive && !cs.consentDismissed && this.flag('widget.modernUi', true)
                ? html`
                    <div class="consent">
                      <p>By chatting here you agree this conversation may be processed and recorded to provide support.</p>
                      <button type="button" class="consent-x" aria-label="Dismiss" @click="${() => this.emit('cw:dismiss-consent')}">✕</button>
                    </div>
                  `
                : ''
              }

              <!-- ATTACHMENT POPUP -->
              ${cs.attachOpen
                ? html`
                    <cw-attach-menu
                      @cw:trigger-file-select="${this.openFileSelector}"
                    ></cw-attach-menu>
                  `
                : ''
              }

              <!-- MENU POPUP -->
              ${cs.menuOpen
                ? html`<cw-chat-menu .soundsOn="${cs.soundsOn}"></cw-chat-menu>`
                : ''
              }

              <!-- EMOJI PICKER -->
              ${cs.emojiOpen
                ? html`<cw-emoji-picker></cw-emoji-picker>`
                : ''
              }

              <!-- COMPOSER BAR (ACTIVE STATE) -->
              ${isActive
                ? html`
                    <cw-composer
                      .inputBg="${cw.inputBg || ''}"
                      .inputTextColor="${cw.inputTextColor || ''}"
                      .inputPlaceholderColor="${cw.inputPlaceholderColor || ''}"
                      .inputBorderColor="${cw.inputBorderColor || ''}"
                      .inputFocusBorderColor="${cw.inputFocusBorderColor || ''}"
                      .inputFocusShadow="${cw.inputFocusShadow || ''}"
                      .inputPadding="${cw.inputPadding || ''}"
                      .inputMargin="${cw.inputMargin || ''}"
                      .inputBorderRadius="${cw.inputBorderRadius}"
                      .textareaFontSize="${cw.textareaFontSize || ''}"
                      .attachButtonBg="${cw.attachButtonBg || ''}"
                      .attachButtonColor="${cw.attachButtonColor || ''}"
                      .emojiButtonColor="${cw.emojiButtonColor || ''}"
                      .sendButtonBgActive="${cw.sendButtonBgActive || ''}"
                      .sendButtonColorActive="${cw.sendButtonColorActive || ''}"
                      .sendButtonBgInactive="${cw.sendButtonBgInactive || ''}"
                      .sendButtonColorInactive="${cw.sendButtonColorInactive || ''}"
                      .sendIconType="${cw.sendIconType || ''}"
                      .accentColor="${cw.accentColor || ''}"
                      .draft="${cs.draft || ''}"
                      .attachmentsEnabled="${cw.attachmentsEnabled !== false && this.flag('attachments.enabled', true)}"
                      .modernUi="${cw.modernUi !== false && this.flag('widget.modernUi', true)}"
                      .uploading="${cs.uploading}"
                      .rev="${this.rev}"
                    ></cw-composer>

                    <cw-chat-footer
                      .modernUi="${cw.modernUi !== false && this.flag('widget.modernUi', true)}"
                      .poweredByText="${cw.poweredByText || ''}"
                      .poweredByLink="${cw.poweredByLink || ''}"
                      .poweredByColor="${cw.poweredByColor || ''}"
                      .footerBg="${cw.footerBg || cw.bodyBg || ''}"
                      .footerTextColor="${cw.footerTextColor || ''}"
                      .footerFontSize="${cw.footerFontSize}"
                      .footerPaddingBottom="${cw.footerPaddingBottom}"
                      .widgetBorderRadius="${cw.widgetBorderRadius}"
                    ></cw-chat-footer>
                  `
                : ''
              }

              <!-- CLOSED NOTE -->
              ${isClosed
                ? html`
                    <div class="closed-note">
                      <p>Chat ended</p>
                      <button type="button" class="primary" @click="${() => this.emit('cw:start-new')}">Start new chat</button>
                    </div>
                  `
                : ''
              }
            `
          : ''
        }

        <cw-image-cropper
          .open="${this.cropperOpen}"
          .imageSrc="${this.pendingImageSrc}"
          @cw:image-cropped="${(e: CustomEvent) => {
            this.cropperOpen = false;
            // Emit the full data URL as a dedicated event so the page layer
            // can store it as a real image attachment (not a truncated string).
            this.emit('cw:send-cropped-image', e.detail.dataUrl as string);
          }}"
          @cw:close="${() => (this.cropperOpen = false)}"
        ></cw-image-cropper>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cw-chat-body': CwChatBody;
  }
}
