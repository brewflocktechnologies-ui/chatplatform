import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { ChatbarState } from '../../store/types.js';
import { CORE_STYLES } from '../../styles/core-styles.js';
import { REDUCED_MOTION_CSS } from '../../tokens/accessibility.js';
import {
  getBorderRadius,
  getChatbarBackground,
  getChatbarFontSize,
  getChatbarIconWidth,
  getChatbarIconHeight
} from '../../utils/style-helpers.js';
import '../atoms/cw-icon.js';
import '../atoms/cw-badge.js';

@customElement('cw-chatbar')
export class CwChatbar extends LitElement {
  @property({ type: Object }) config?: ChatbarState;
  @property({ type: Boolean }) panelOpen = false;
  @property({ type: Number }) unreadCount = 0;
  @property({ type: Number }) rev = 0;
  /** When true (default) the bar is fixed to the viewport; set false to position it inside a container (used by stories). */
  @property({ type: Boolean }) fixed = true;

  @state() hovered = false;

  static styles = [
    CORE_STYLES,
    css`
      :host {
        display: block;
      }
      .chatbar-wrapper {
        position: fixed;
        z-index: 40;
        display: flex;
        align-items: center;
        cursor: pointer;
        user-select: none;
        box-sizing: border-box;
        transition: transform 0.2s ease, box-shadow 0.2s ease, width 0.2s ease, height 0.2s ease;
        max-width: calc(100% - 24px);
        max-height: calc(100% - 24px);
      }
      @media (max-width: 480px) {
        .chatbar-wrapper {
          max-width: calc(100% - 24px) !important;
          right: 12px !important;
        }
      }
      .card-layout {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        height: 100%;
        min-height: 170px;
        box-sizing: border-box;
        position: relative;
      }
      .bar-layout {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        height: 100%;
      }
    `
  ];

  private handleClick() {
    this.dispatchEvent(
      new CustomEvent('cw:toggle', { bubbles: true, composed: true })
    );
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.handleClick();
    }
  }

  render() {
    const s = this.config || ({} as ChatbarState);
    if (!s.enabled || (s.hideOnOpen && this.panelOpen)) return html``;

    const isCard = s.layout === 'card';
    const widthVal = isCard
      ? (s.width && s.width >= 180 ? s.width : 250)
      : (s.width && s.width >= 100 ? s.width : 255);

    const heightVal = isCard
      ? (s.height && s.height >= 120 ? `${s.height}px` : '220px')
      : `${s.height && s.height >= 30 && s.height <= 80 ? s.height : 46}px`;

    const rawBottom = s.offsetBottom !== undefined ? s.offsetBottom : 16;
    const rawRight = s.offsetRight !== undefined ? s.offsetRight : 16;

    const bg = getChatbarBackground(s);
    const borderRadius = getBorderRadius(s.borderRadius, isCard ? '24px' : '9999px');
    const transform = this.hovered ? 'scale(1.02)' : 'scale(1.0)';
    const padding = s.padding && s.padding !== (isCard ? '0 18px' : '24px 20px') ? s.padding : (isCard ? '24px 20px' : '0 18px');
    const gap = s.gap !== undefined && s.gap !== (isCard ? 0 : 12) ? `${s.gap}px` : (isCard ? '12px' : '0');

    return html`
      <div
        class="chatbar-wrapper"
        role="button"
        tabindex="0"
        aria-label="${this.panelOpen ? 'Close chat' : 'Open chat'}"
        style="position: ${this.fixed ? 'fixed' : 'absolute'}; width: ${widthVal}px; height: ${heightVal}; max-width: calc(100% - 24px); max-height: calc(100% - 24px); bottom: ${rawBottom}px; right: ${rawRight}px; background: ${bg}; color: ${s.textColor || '#ffffff'}; border-radius: ${borderRadius}; box-shadow: ${s.shadow !== false ? '0 8px 24px rgba(0,0,0,0.18)' : 'none'}; padding: ${padding}; transform: ${transform}; flex-direction: ${isCard ? 'column' : 'row'}; gap: ${gap}"
        @mouseenter="${() => (this.hovered = true)}"
        @mouseleave="${() => (this.hovered = false)}"
        @click="${this.handleClick}"
        @keydown="${this.handleKeyDown}"
      >
        ${isCard
          ? html`
              <!-- CARD LAYOUT (Centered Icon & Action Button like Image 2) -->
              <div class="card-layout">
                <div style="display: flex; align-items: center; justify-content: center; width: 100%; margin-top: 4px">
                  ${s.iconType === 'image' && s.iconImageUrl
                    ? html`
                        <img
                          src="${s.iconImageUrl}"
                          alt="icon"
                          style="object-fit: ${s.iconFit || 'contain'}; opacity: ${s.iconOpacity !== undefined ? s.iconOpacity : 1}; width: ${(s.iconWidth || 36)}px; height: ${(s.iconHeight || 36)}px; mix-blend-mode: ${s.iconBlend || 'normal'}"
                        />
                      `
                    : s.iconType === 'customSvg' && s.customSvg
                    ? html`<cw-icon .customSvg="${s.customSvg}" .size="${s.iconWidth || 36}" .color="${s.iconColor || s.textColor || '#ffffff'}"></cw-icon>`
                    : html`<cw-icon .name="${s.lucideIcon || 'MessageSquare'}" .size="${s.iconWidth || 36}" .color="${s.iconColor || s.textColor || '#ffffff'}"></cw-icon>`
                  }
                </div>

                <div
                  style="font-weight: 700; line-height: 1.35; text-align: center; font-size: ${(s.textSize || 16)}px; letter-spacing: ${(s.letterSpacing || 0)}px; color: ${s.textColor || '#ffffff'}; margin: 16px 0; width: 100%"
                >
                  ${s.cardText || s.text || 'Questions about PhonePe for business?'}
                </div>

                <div
                  style="background-color: ${s.buttonBg || '#ffffff'}; color: ${s.buttonTextColor || s.bgColor || '#5f259f'}; font-weight: 700; border-radius: 9999px; display: flex; align-items: center; justify-content: center; padding: 11px 24px; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.12); width: 100%; box-sizing: border-box; margin-top: auto"
                >
                  <span>${s.buttonText || 'Chat Now'}</span>
                </div>

                ${this.unreadCount > 0
                  ? html`<cw-badge .count="${this.unreadCount}" .config="${s.badge}"></cw-badge>`
                  : ''
                }
              </div>
            `
          : html`
              <!-- BAR LAYOUT (Horizontal) -->
              <div class="bar-layout">
                <span
                  style="font-weight: 600; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; min-width: 0; text-align: left; font-size: ${getChatbarFontSize(s.textSize, typeof s.height === 'number' ? s.height : 46)}; letter-spacing: ${(s.letterSpacing || 0)}px; color: ${s.textColor || '#ffffff'}"
                >
                  ${(s.text || 'Chat with us').replace(/\n/g, ' ')}
                </span>

                <div style="display: flex; align-items: center; justify-content: center; position: relative; flex-shrink: 0; margin-left: 10px">
                  ${s.iconType === 'image' && s.iconImageUrl
                    ? html`
                        <img
                          src="${s.iconImageUrl}"
                          alt="icon"
                          style="object-fit: ${s.iconFit || 'contain'}; opacity: ${s.iconOpacity !== undefined ? s.iconOpacity : 1}; width: ${getChatbarIconWidth(s.iconWidth, typeof s.height === 'number' ? s.height : 46, 'image')}px; height: ${getChatbarIconHeight(s.iconHeight, typeof s.height === 'number' ? s.height : 46, 'image')}px; mix-blend-mode: ${s.iconBlend || 'normal'}"
                        />
                      `
                    : s.iconType === 'customSvg' && s.customSvg
                    ? html`
                        <cw-icon
                          .customSvg="${s.customSvg}"
                          .size="${getChatbarIconWidth(s.iconWidth, typeof s.height === 'number' ? s.height : 46, 'customSvg')}"
                          .color="${s.iconColor || '#ffffff'}"
                        ></cw-icon>
                      `
                    : html`
                        <cw-icon
                          .name="${s.lucideIcon || 'MessageCircle'}"
                          .size="${getChatbarIconWidth(s.iconWidth, typeof s.height === 'number' ? s.height : 46, 'lucide')}"
                          .color="${s.iconColor || '#ffffff'}"
                        ></cw-icon>
                      `
                  }

                  ${this.unreadCount > 0
                    ? html`<cw-badge .count="${this.unreadCount}" .config="${s.badge}"></cw-badge>`
                    : ''
                  }
                </div>
              </div>
            `
        }
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cw-chatbar': CwChatbar;
  }
}
