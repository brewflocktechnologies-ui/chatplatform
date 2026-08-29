import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CORE_STYLES } from '../../styles/core-styles.js';
import '../atoms/cw-icon.js';
import '../atoms/cw-button.js';

/**
 * cw-composer
 * Pure presentational molecule. Sends data UP via composed CustomEvents
 * (`cw:draft-change`, `cw:send`, `cw:toggle-attach`, `cw:toggle-emoji`).
 * Takes explicit primitive property inputs instead of a config blob contract.
 */
@customElement('cw-composer')
export class CwComposer extends LitElement {
  @property({ type: String }) draft = '';
  @property({ type: Boolean }) attachmentsEnabled = true;
  @property({ type: Boolean }) modernUi = true;
  @property({ type: Boolean }) uploading = false;
  @property({ type: Number }) rev = 0;

  /* Primitive styling properties */
  @property({ type: String }) inputBg = '';
  @property({ type: String }) inputTextColor = '';
  @property({ type: String }) inputPlaceholderColor = '';
  @property({ type: String }) inputBorderColor = '';
  @property({ type: String }) inputFocusBorderColor = '';
  @property({ type: String }) inputFocusShadow = '';
  @property({ type: String }) inputPadding = '';
  @property({ type: String }) inputMargin = '';
  @property() inputBorderRadius?: number | string;
  @property({ type: String }) textareaFontSize = '';
  @property({ type: String }) attachButtonBg = '';
  @property({ type: String }) attachButtonColor = '';
  @property({ type: String }) emojiButtonColor = '';
  @property({ type: String }) sendButtonBgActive = '';
  @property({ type: String }) sendButtonColorActive = '';
  @property({ type: String }) sendButtonBgInactive = '';
  @property({ type: String }) sendButtonColorInactive = '';
  @property({ type: String }) sendIconType = '';
  @property({ type: String }) accentColor = '';

  @state() focused = false;

  static styles = [
    CORE_STYLES,
    css`
      :host {
        display: block;
        width: 100%;
      }
      .composer {
        display: flex;
        align-items: center;
        gap: 6px;
        box-sizing: border-box;
        transition: all 0.2s ease;
      }
      textarea {
        flex: 1;
        border: none;
        resize: none;
        padding: 6px 12px;
        background: transparent;
        outline: none;
        font-family: inherit;
        height: 32px;
        min-height: 24px;
        max-height: 120px;
        overflow-y: auto;
        box-sizing: border-box;
      }
      textarea::placeholder {
        color: var(--placeholder-color, var(--cw-muted, #667085)) !important;
      }
    `
  ];

  private emit(name: string, detail?: unknown) {
    this.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true, composed: true })
    );
  }

  private handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    this.draft = target.value;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
    this.emit('cw:draft-change', this.draft);
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  }

  protected updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has('draft')) {
      const textarea = this.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea');
      if (textarea && textarea.value !== (this.draft || '')) {
        textarea.value = this.draft || '';
        if (!this.draft) {
          textarea.style.height = '32px';
        }
      }
    }
  }

  private send() {
    const text = this.draft.trim();
    if (!text) return;
    this.draft = '';
    const textarea = this.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea');
    if (textarea) {
      textarea.value = '';
      textarea.style.height = '32px';
    }
    this.emit('cw:draft-change', '');
    this.emit('cw:send', text);
    this.requestUpdate();
  }

  private toggleAttach() {
    this.emit('cw:toggle-attach');
  }

  private toggleEmoji() {
    this.emit('cw:toggle-emoji');
  }

  /** Moves keyboard focus to the message input. */
  focusInput() {
    this.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea')?.focus();
  }

  render() {
    const isFocused = this.focused;
    const canSend = !!this.draft.trim();

    const padding = this.inputPadding || '6px 8px';
    const margin = this.inputMargin || '12px 16px';
    const bg = this.inputBg || 'var(--cw-surface, #ffffff)';
    const borderRadius = typeof this.inputBorderRadius === 'number'
      ? `${this.inputBorderRadius}px`
      : (this.inputBorderRadius !== undefined ? this.inputBorderRadius : '9999px');

    const borderColor = isFocused
      ? this.inputFocusBorderColor || this.accentColor || 'var(--cw-accent, #0b5fff)'
      : this.inputBorderColor || 'var(--cw-border, #e9ecf1)';

    const boxShadow = isFocused
      ? this.inputFocusShadow || '0 0 0 2px rgba(11, 95, 255, 0.1)'
      : 'none';

    const inputTextColor = this.inputTextColor || 'var(--cw-ink, #101828)';
    const placeholderColor = this.inputPlaceholderColor || 'var(--cw-muted, #667085)';
    const textareaFontSize = this.textareaFontSize || '14px';

    const attachBg = this.attachButtonBg || '#ffffff';
    const attachColor = this.attachButtonColor || 'var(--cw-muted, #667085)';
    const emojiColor = this.emojiButtonColor || 'var(--cw-muted, #667085)';

    const sendBg = !canSend
      ? this.sendButtonBgInactive || 'var(--cw-border, #e9ecf1)'
      : this.sendButtonBgActive || this.accentColor || 'var(--cw-accent, #0b5fff)';

    const sendColor = !canSend
      ? this.sendButtonColorInactive || 'var(--cw-muted, #667085)'
      : this.sendButtonColorActive || '#ffffff';

    return html`
      <div
        class="composer"
        style="padding: ${padding}; margin: ${margin}; background: ${bg}; border-radius: ${borderRadius}; border: 1px solid ${borderColor}; box-shadow: ${boxShadow}; --placeholder-color: ${placeholderColor}"
      >
        ${this.attachmentsEnabled
          ? html`
              <cw-button
                variant="icon"
                size="xs"
                icon="Plus"
                .iconSize="${16}"
                .bg="${attachBg}"
                .color="${attachColor}"
                label="Attach"
                ?disabled="${this.uploading}"
                @click="${this.toggleAttach}"
              ></cw-button>
            `
          : ''
        }

        <textarea
          rows="1"
          maxlength="4000"
          placeholder="Write a message…"
          aria-label="Message"
          .value="${this.draft}"
          style="color: ${inputTextColor}; font-size: ${textareaFontSize}"
          @input="${this.handleInput}"
          @keydown="${this.handleKeyDown}"
          @focus="${() => (this.focused = true)}"
          @blur="${() => (this.focused = false)}"
        ></textarea>

        ${this.modernUi
          ? html`
              <cw-button
                variant="icon"
                size="xs"
                icon="Smile"
                .iconSize="${20}"
                .color="${emojiColor}"
                label="Emoji"
                @click="${this.toggleEmoji}"
              ></cw-button>
            `
          : ''
        }

        <cw-button
          variant="icon"
          size="xs"
          .icon="${this.sendIconType === 'arrow' ? 'ArrowUp' : 'SendFilled'}"
          .iconSize="${this.sendIconType === 'arrow' ? 16 : 18}"
          .bg="${sendBg}"
          .color="${sendColor}"
          label="Send message"
          ?disabled="${!canSend}"
          @click="${this.send}"
        ></cw-button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cw-composer': CwComposer;
  }
}
