import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CORE_STYLES } from '../../styles/core-styles.js';
import { REDUCED_MOTION_CSS } from '../../tokens/accessibility.js';
import '../atoms/cw-button.js';

/**
 * cw-confirm-dialog
 * Pure presentational organism representing the end-chat confirm modal overlay.
 * Uses <cw-button> for action buttons. Emits `cw:confirm-cancel` and `cw:confirm-end`.
 * Takes explicit primitive property inputs instead of a config blob contract.
 */
@customElement('cw-confirm-dialog')
export class CwConfirmDialog extends LitElement {
  @property({ type: String }) message = 'Are you sure you want to end this chat?';
  @property({ type: String }) cancelLabel = 'Cancel';
  @property({ type: String }) confirmLabel = 'Confirm';
  @property({ type: String }) modalCardBg = '#ffffff';
  @property({ type: String }) modalMessageColor = 'var(--cw-ink, #101828)';
  @property({ type: Number }) modalBorderRadius = 16;
  @property({ type: String }) cancelBg = 'var(--cw-surface, #ffffff)';
  @property({ type: String }) cancelTextColor = 'var(--cw-muted, #667085)';
  @property({ type: String }) cancelBorderColor = 'var(--cw-border, #e9ecf1)';
  @property({ type: String }) confirmBg = 'var(--cw-accent, #0b5fff)';
  @property({ type: String }) confirmTextColor = '#ffffff';

  static styles = [
    CORE_STYLES,
    REDUCED_MOTION_CSS,
    css`
      :host {
        display: block;
      }
      .modal-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(2px);
        z-index: 100;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
      }
      .modal-card {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        width: 100%;
        max-width: 300px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        box-sizing: border-box;
      }
      .modal-message {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        line-height: 1.4;
      }
      .modal-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
    `,
  ];

  private onCancel() {
    this.dispatchEvent(new CustomEvent('cw:confirm-cancel', { bubbles: true, composed: true }));
  }

  private onConfirm() {
    this.dispatchEvent(new CustomEvent('cw:confirm-end', { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Confirmation">
        <div class="modal-card" style="background: ${this.modalCardBg}; border-radius: ${this.modalBorderRadius}px">
          <p class="modal-message" style="color: ${this.modalMessageColor}">
            ${this.message}
          </p>

          <div class="modal-actions">
            <cw-button
              variant="ghost"
              size="sm"
              .label="${this.cancelLabel}"
              .bg="${this.cancelBg}"
              .color="${this.cancelTextColor}"
              .borderColor="${this.cancelBorderColor}"
              @click="${this.onCancel}"
            ></cw-button>

            <cw-button
              variant="primary"
              size="sm"
              .label="${this.confirmLabel}"
              .bg="${this.confirmBg}"
              .color="${this.confirmTextColor}"
              @click="${this.onConfirm}"
            ></cw-button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cw-confirm-dialog': CwConfirmDialog;
  }
}
