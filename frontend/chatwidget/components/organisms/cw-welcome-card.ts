import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { WelcomeConfig } from '../../store/types.js';
import { CORE_STYLES } from '../../styles/core-styles.js';
import { REDUCED_MOTION_CSS } from '../../tokens/accessibility.js';
import '../atoms/cw-button.js';
import '../molecules/cw-welcome-hero.js';
import '../molecules/cw-welcome-cta.js';

/**
 * cw-welcome-card
 * Organism representing the full welcome card screen.
 * Delegates hero text/avatar rendering to <cw-welcome-hero> and CTA button to <cw-welcome-cta>.
 */
@customElement('cw-welcome-card')
export class CwWelcomeCard extends LitElement {
  @property({ type: Object }) config?: WelcomeConfig;
  @property({ type: String }) accentColor = 'var(--cw-accent, #0b5fff)';

  static styles = [
    CORE_STYLES,
    REDUCED_MOTION_CSS,
    css`
      :host {
        display: block;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
      }
      .welcome-container {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-sizing: border-box;
        position: relative;
        overflow: hidden;
      }
      .bg-blobs {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        pointer-events: none;
        z-index: 0;
      }
      .blob-1 {
        position: absolute;
        top: -50%;
        right: -20%;
        width: 140%;
        height: 120%;
        background: linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 80%);
        border-radius: 50%;
        transform: rotate(-15deg);
      }
      .blob-2 {
        position: absolute;
        top: -20%;
        right: -30%;
        width: 120%;
        height: 100%;
        background: linear-gradient(200deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 60%);
        border-radius: 40% 60% 50% 50%;
        transform: rotate(10deg);
      }
      .blob-3 {
        position: absolute;
        bottom: -40%;
        left: -20%;
        width: 130%;
        height: 100%;
        background: linear-gradient(35deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 70%);
        border-radius: 50%;
        transform: rotate(-10deg);
      }
      .content-wrapper {
        position: relative;
        z-index: 10;
        display: flex;
        flex-direction: column;
        height: 100%;
        max-height: 100%;
        overflow: hidden;
        justify-content: space-between;
      }
      .close-btn-wrapper {
        position: absolute;
        top: -10px;
        right: -10px;
        z-index: 20;
      }
      .layout-col {
        display: flex;
        flex-direction: column;
        height: 100%;
        max-height: 100%;
        overflow: hidden;
        justify-content: space-between;
        width: 100%;
      }
      .glassy-container {
        display: flex;
        flex-direction: column;
        gap: clamp(10px, 2.5vh, 24px);
        justify-content: space-between;
        padding: clamp(14px, 2.5vh, 32px) clamp(14px, 3vw, 24px);
        box-sizing: border-box;
      }
      @media (max-height: 580px) {
        .welcome-container {
          padding: 16px 14px 8px 14px !important;
        }
        .glassy-container {
          padding: 14px 16px !important;
          gap: 10px !important;
        }
      }
      .footer-brand {
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 11px;
        font-weight: 500;
        opacity: 0.8;
        margin-top: auto;
        padding-top: 10px;
        flex-shrink: 0;
      }
      .footer-brand a {
        font-weight: 700;
        color: inherit;
        text-decoration: none;
      }
    `,
  ];

  private close() {
    this.dispatchEvent(
      new CustomEvent('cw:close-panel', { bubbles: true, composed: true })
    );
  }

  private renderFooter(w: WelcomeConfig) {
    const poweredByLink = w.poweredByLink || '#';
    const poweredByText = w.poweredByText || 'vAInatheya.ai';
    const color = w.subtextColor || 'rgba(255,255,255,0.9)';
    const paddingBottom = typeof w.footerPaddingBottom === 'number' ? `${w.footerPaddingBottom}px` : (w.footerPaddingBottom || '0px');

    return html`
      <div class="footer-brand" style="color: ${color}; padding-bottom: ${paddingBottom}">
        <span>Powered by</span>&nbsp;
        <a href="${poweredByLink}" target="_blank" rel="noopener noreferrer">${poweredByText}</a>
      </div>
    `;
  }

  render() {
    const w = this.config || {};
    const headerTextColor = w.headerTextColor || '#ffffff';
    const bgGradient = w.bgGradient || 'gradient(135deg, var(--cw-accent, #0b5fff), #22d3ee)';
    const padding = w.padding || '24px 20px 12px 20px';
    const isGlassy = w.cardLayout === 'glassy';

    return html`
      <div class="welcome-container" style="padding: ${padding}; color: ${headerTextColor}; background: ${bgGradient}">
        <div class="bg-blobs">
          <div class="blob-1"></div>
          <div class="blob-2"></div>
          <div class="blob-3"></div>
        </div>

        <div class="content-wrapper">
          <cw-button
            variant="icon"
            size="sm"
            icon="Close"
            .iconSize="${16}"
            scalable
            class="close-btn-wrapper"
            .color="${headerTextColor}"
            aria-label="Close welcome card"
            @click="${this.close}"
          ></cw-button>

          <div class="layout-col">
            ${isGlassy
              ? html`
                  <div style="display: flex; flex-direction: column; height: 100%; margin-bottom: 12px; justify-content: ${w.cardAlign === 'center' || w.cardPosition === 'center' ? 'center' : 'space-between'}">
                    <cw-welcome-hero .config="${w}" .headerTextColor="${headerTextColor}" isGlassy logoOnly></cw-welcome-hero>
                    <div
                      class="glassy-container"
                      style="background: ${w.cardBg || 'rgba(255, 255, 255, 0.12)'}; border: ${w.cardBorder || '1px solid rgba(255, 255, 255, 0.22)'}; border-radius: ${(w.cardBorderRadius || 24)}px; ${w.cardPadding ? `padding: ${w.cardPadding};` : ''} backdrop-filter: blur(${(w.cardBlur || 16)}px); -webkit-backdrop-filter: blur(${(w.cardBlur || 16)}px); box-shadow: ${w.cardShadow || '0 12px 40px 0 rgba(0, 0, 0, 0.15)'}; flex: 1; width: 100%; min-height: 0;"
                    >
                      <cw-welcome-hero .config="${w}" .headerTextColor="${headerTextColor}" isGlassy hideLogo></cw-welcome-hero>
                      <cw-welcome-cta .config="${w}" .accentColor="${this.accentColor}"></cw-welcome-cta>
                    </div>
                  </div>
                `
              : html`
                  <div style="flex: 1">
                    <cw-welcome-hero .config="${w}" .headerTextColor="${headerTextColor}"></cw-welcome-hero>
                  </div>
                  <div style="margin-bottom: 12px">
                    <cw-welcome-cta .config="${w}" .accentColor="${this.accentColor}"></cw-welcome-cta>
                  </div>
                `
            }

            ${this.renderFooter(w)}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cw-welcome-card': CwWelcomeCard;
  }
}
