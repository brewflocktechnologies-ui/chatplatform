import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { WelcomeConfig } from '../../store/types.js';
import { REDUCED_MOTION_CSS } from '../../tokens/accessibility.js';
import '../atoms/cw-icon.js';
import './cw-avatar.js';

/**
 * cw-welcome-hero
 * Pure presentational molecule representing the logo, title, description, and avatar stack of the welcome card.
 */
@customElement('cw-welcome-hero')
export class CwWelcomeHero extends LitElement {
  @property({ type: Object }) config?: WelcomeConfig;
  @property({ type: String }) headerTextColor = '#ffffff';
  @property({ type: Boolean }) isGlassy = false;
  @property({ type: Boolean }) hideLogo = false;
  @property({ type: Boolean }) logoOnly = false;

  static styles = [
    REDUCED_MOTION_CSS,
    css`
      :host {
        display: block;
        width: 100%;
      }
      .logo-container {
        display: flex;
        align-items: center;
        flex-shrink: 0;
      }
      .logo-img {
        height: 36px;
        object-fit: contain;
      }
      .text-block {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .welcome-title {
        font-weight: 800;
        line-height: 1.2;
        letter-spacing: -0.02em;
        margin: 0;
        font-size: var(--cw-welcome-title-size, clamp(18px, 4vw, 24px));
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .welcome-desc {
        line-height: 1.4;
        font-weight: 400;
        margin: 0;
        font-size: var(--cw-welcome-desc-size, clamp(13px, 3vw, 15px));
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .avatars-row {
        display: flex;
        align-items: center;
        gap: 0;
        margin-top: 10px;
        width: 100%;
      }
      @media (max-height: 580px) {
        .welcome-title {
          font-size: clamp(16px, 4vw, 20px) !important;
          -webkit-line-clamp: 2 !important;
        }
        .welcome-desc {
          font-size: 13px !important;
        }
        .logo-container {
          margin-bottom: 8px !important;
        }
        .avatars-row {
          margin-top: 6px !important;
        }
      }
    `,
  ];

  private resolveAvatarUrl(avatar: any): string {
    if (typeof avatar === 'string' && avatar.trim() && !avatar.startsWith('[object')) {
      return avatar;
    }
    if (avatar && typeof avatar === 'object') {
      const url = avatar.url || avatar.src || avatar.avatar || avatar.imageUrl || '';
      if (url && typeof url === 'string') return url;
    }
    return '';
  }

  render() {
    const w = this.config || {};
    const logoAlign = this.isGlassy
      ? (w.logoAlign || (w.textAlign === 'center' || w.cardAlign === 'center' ? 'center' : 'flex-start'))
      : 'flex-start';
    const logoMargin = this.isGlassy ? '20px' : '28px';

    const textAlign = this.isGlassy
      ? (w.textAlign || (w.cardAlign === 'center' ? 'center' : 'left'))
      : 'left';

    const avatarAlign = this.isGlassy
      ? (w.avatarAlign || (w.textAlign === 'center' || w.cardAlign === 'center' ? 'center' : 'flex-start'))
      : 'flex-start';

    if (this.logoOnly) {
      return html`
        <div class="logo-container" style="justify-content: ${logoAlign}; margin-bottom: ${logoMargin}">
          ${w.logoUrl
            ? html`<img src="${w.logoUrl}" alt="${w.logoAlt || 'Company Logo'}" class="logo-img" />`
            : html`
                <div style="color: ${this.headerTextColor}">
                  <cw-icon .name="${'MessageCircle'}" .size="${42}"></cw-icon>
                </div>
              `
          }
        </div>
      `;
    }

    return html`
      ${!this.hideLogo
        ? html`
            <div class="logo-container" style="justify-content: ${logoAlign}; margin-bottom: ${logoMargin}">
              ${w.logoUrl
                ? html`<img src="${w.logoUrl}" alt="${w.logoAlt || 'Company Logo'}" class="logo-img" />`
                : html`
                    <div style="color: ${this.headerTextColor}">
                      <cw-icon .name="${'MessageCircle'}" .size="${42}"></cw-icon>
                    </div>
                  `
              }
            </div>
          `
        : ''
      }

      <!-- Text Block -->
      <div
        class="text-block"
        style="text-align: ${textAlign}; align-items: ${textAlign === 'center' ? 'center' : 'flex-start'}; margin-bottom: ${this.isGlassy ? '0' : '24px'}"
      >
        <h2 class="welcome-title" style="${w.titleFontSize ? `--cw-welcome-title-size: ${typeof w.titleFontSize === 'number' ? `${w.titleFontSize}px` : w.titleFontSize};` : ''} color: ${this.headerTextColor}">
          ${w.title || 'Hi there! 👋 How can we help you today?'}
        </h2>
        <p class="welcome-desc" style="${w.descriptionFontSize ? `--cw-welcome-desc-size: ${typeof w.descriptionFontSize === 'number' ? `${w.descriptionFontSize}px` : w.descriptionFontSize};` : ''} color: ${w.subtextColor || 'rgba(255,255,255,0.9)'}">
          ${w.description || 'Our support heroes are here to assist you.'}
        </p>

        <!-- Overlapping Avatars -->
        <div class="avatars-row" style="justify-content: ${avatarAlign}">
          ${(w.avatars || []).map(
            (avatar: any, idx: number) => html`
              <cw-avatar
                .src="${this.resolveAvatarUrl(avatar)}"
                .name="${typeof avatar === 'object' && avatar?.name ? avatar.name : 'Agent'}"
                .size="${34}"
                .showOnline="${false}"
                style="margin-left: ${idx === 0 ? '0' : '-10px'}; border: 2px solid ${w.avatarBorderColor || 'rgba(255,255,255,0.2)'}; border-radius: 50%; z-index: ${10 + idx}; box-shadow: 0 4px 6px rgba(0,0,0,0.1)"
              ></cw-avatar>
            `
          )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cw-welcome-hero': CwWelcomeHero;
  }
}
