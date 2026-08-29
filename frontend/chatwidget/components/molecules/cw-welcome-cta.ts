import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { WelcomeConfig } from '../../store/types.js';
import { REDUCED_MOTION_CSS } from '../../tokens/accessibility.js';
import '../atoms/cw-icon.js';
import '../atoms/cw-button.js';

/**
 * cw-welcome-cta
 * Pure presentational molecule representing the main CTA button in the welcome card.
 * Emits `cw:start-chat` on click.
 */
@customElement('cw-welcome-cta')
export class CwWelcomeCta extends LitElement {
  @property({ type: Object }) config?: WelcomeConfig;
  @property({ type: String }) accentColor = 'var(--cw-accent, #0b5fff)';

  static styles = [
    REDUCED_MOTION_CSS,
    css`
      :host {
        display: block;
        width: 100%;
      }
      .btn-inner {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        text-align: left;
      }
      .btn-icon-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .btn-text-col {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .btn-text-main {
        font-weight: 700;
        font-size: 15px;
        letter-spacing: -0.01em;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .btn-text-sub {
        font-size: 12px;
        font-weight: 500;
        opacity: 0.6;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      @media (max-height: 580px) {
        .btn-text-main {
          font-size: 14px !important;
        }
        .btn-text-sub {
          font-size: 11px !important;
        }
      }
    `,
  ];

  private start() {
    this.dispatchEvent(
      new CustomEvent('cw:start-chat', { bubbles: true, composed: true })
    );
  }

  render() {
    const w = this.config || {};

    return html`
      <cw-button
        fullWidth
        elevatable
        .ariaLabel="${`${w.buttonText || 'Start Conversation'}. ${w.buttonSubtext || 'Typically replies in 5 minutes'}`}"
        .bg="${w.buttonBg || '#ffffff'}"
        .color="${w.buttonTextColor || 'var(--cw-ink, #101828)'}"
        .borderRadius="${(w.buttonBorderRadius || 24) + 'px'}"
        .padding="${w.buttonPadding || 'clamp(12px, 2vh, 16px) clamp(16px, 3vw, 24px)'}"
        @click="${this.start}"
      >
        <div class="btn-inner">
          <div class="btn-icon-wrapper" style="color: ${w.buttonIconColor || this.accentColor}">
            <cw-icon .name="${'ChatLines'}" .size="${24}"></cw-icon>
          </div>
          <div class="btn-text-col">
            <span class="btn-text-main" style="color: ${w.buttonTextColor || 'var(--cw-ink, #101828)'}">
              ${w.buttonText || 'Start Conversation'}
            </span>
            <span class="btn-text-sub" style="color: ${w.buttonTextColor || 'var(--cw-ink, #101828)'}">
              ${w.buttonSubtext || 'Typically replies in 5 minutes'}
            </span>
          </div>
        </div>
      </cw-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cw-welcome-cta': CwWelcomeCta;
  }
}
