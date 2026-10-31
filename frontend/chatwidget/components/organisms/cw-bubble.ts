import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { BubbleState } from '../../store/types.js';
import { CORE_STYLES } from '../../styles/core-styles.js';
import { REDUCED_MOTION_CSS } from '../../tokens/accessibility.js';
import {
  getBorderRadius,
  getCompositeBackground,
  getBoxShadow,
  getInnerShadow,
  hexToRgba
} from '../../utils/style-helpers.js';
import '../atoms/cw-icon.js';
import '../atoms/cw-badge.js';
import '../atoms/cw-tooltip.js';

type Bubble = BubbleState;

/** Which screen corner the launcher sits in, with its offsets (each has its own default). */
function placementStyle(settings: Bubble): string {
  const bottom = settings.offsetBottom ?? 12;
  const right = settings.offsetRight ?? 16;
  const left = settings.offsetLeft ?? 16;
  const top = settings.offsetTop ?? 12;

  switch (settings.position || 'bottom-right') {
    case 'bottom-left':
      return `bottom: ${bottom}px; left: ${left}px;`;
    case 'top-right':
      return `top: ${top}px; right: ${right}px;`;
    case 'top-left':
      return `top: ${top}px; left: ${left}px;`;
    default:
      return `bottom: ${bottom}px; right: ${right}px;`;
  }
}

function glassStyle(settings: Bubble): string {
  if (!settings.glass?.enabled) return '';
  const blur = settings.glass.blur || 10;
  const opacity = settings.glass.bgOpacity || 0.3;
  return `backdrop-filter: blur(${blur}px); -webkit-backdrop-filter: blur(${blur}px); background-color: rgba(255, 255, 255, ${opacity});`;
}

function neonStyle(settings: Bubble): string {
  if (!settings.neon?.enabled) return '';
  const color = settings.neon.color || '#22d3ee';
  const intensity = settings.neon.intensity || 0.8;
  return `box-shadow: 0 0 ${20 * intensity}px ${color}, inset 0 0 ${10 * intensity}px ${color};`;
}

function borderStyle(settings: Bubble): string {
  const b = settings.border || ({} as Partial<Bubble['border']>);
  return b.width ? `border: ${b.width}px ${b.style || 'solid'} ${b.color || 'transparent'};` : '';
}

/** The gentle idle float, only while the launcher is untouched and the panel is closed. */
function idleAnimationStyle(settings: Bubble, interacting: boolean): string {
  const idle = settings.idleAnim;
  if (!idle?.enabled || idle.type === 'none' || interacting) return '';
  return `animation: idleFloat ${idle.duration || 3200}ms ease-in-out infinite;`;
}

function dotAnimation(type: string | undefined, index: number): string {
  return type === 'bounce'
    ? `dotBounce 1.2s cubic-bezier(.2,.8,.2,1) ${index * 0.12}s infinite`
    : `dotPulse 1.4s cubic-bezier(.2,.8,.2,1) ${index * 0.1}s infinite`;
}

@customElement('cw-bubble')
export class CwBubble extends LitElement {
  @property({ type: Object }) config?: BubbleState;
  @property({ type: Boolean }) panelOpen = false;
  @property({ type: Number }) unreadCount = 0;
  @property({ type: Boolean }) hasSentMessage = false;
  @property({ type: Number }) rev = 0;
  /** When true (default) the bubble is fixed to the viewport; set false to position it inside a positioned container (used by stories). */
  @property({ type: Boolean }) fixed = true;

  @state() hovered = false;

  static readonly styles = [
    CORE_STYLES,
    REDUCED_MOTION_CSS,
    css`
      :host {
        display: block;
      }
      .bubble-wrapper {
        position: fixed;
        z-index: 40;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        user-select: none;
        box-sizing: border-box;
        transform-style: preserve-3d;
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease, background 0.3s ease;
        max-width: calc(100% - 24px);
        max-height: calc(100% - 24px);
      }
      .overlay-img {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background-repeat: no-repeat;
        background-position: center;
      }
      .overlay-icon {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      }
      .icon-container {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        color: #ffffff;
        border-radius: inherit;
        overflow: hidden;
      }
      .dots-container {
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
      }
      .dot-span {
        border-radius: 50%;
      }
      @keyframes dotBounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      @keyframes dotPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.25); }
      }
      @keyframes idleFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      .tooltip-box {
        position: absolute;
        white-space: nowrap;
        pointer-events: auto;
        z-index: 100;
        box-sizing: border-box;
      }
      .tooltip-arrow {
        position: absolute;
        box-sizing: border-box;
        pointer-events: none;
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

  /** Moves keyboard focus to the launcher (used when the panel closes). */
  focus() {
    this.shadowRoot?.querySelector<HTMLElement>('.bubble-wrapper')?.focus();
  }

  private renderOverlays(settings: Bubble) {
    return html`
      ${settings.backgroundOverlayType === 'image' && settings.backgroundImageUrl
        ? html`
            <div
              class="overlay-img"
              style="background-image: url(${settings.backgroundImageUrl}); background-size: ${settings.backgroundImageSize || 'contain'}; opacity: ${settings.backgroundImageOpacity || 0.25}; mix-blend-mode: ${settings.backgroundBlendMode || 'normal'}; border-radius: inherit"
            ></div>
          `
        : ''
      }

      ${settings.backgroundOverlayType === 'lucide' && settings.backgroundLucideIcon
        ? html`
            <div
              class="overlay-icon"
              style="color: ${settings.backgroundLucideColor || '#FFFFFF'}; opacity: ${settings.backgroundLucideOpacity || 0.2}; mix-blend-mode: ${settings.backgroundBlendMode || 'normal'}"
            >
              <cw-icon .name="${settings.backgroundLucideIcon}" .size="${settings.backgroundLucideSize || 24}"></cw-icon>
            </div>
          `
        : ''
      }
    `;
  }

  /** The launcher glyph: the uploaded image, a custom SVG, or a named icon. */
  private renderLauncherIcon(settings: Bubble) {
    if (settings.iconType === 'image' && (settings.iconImageUrl || settings.backgroundImageUrl)) {
      return html`
        <img
          src="${settings.iconImageUrl || settings.backgroundImageUrl}"
          alt="bubble icon"
          style="width: 100%; height: 100%; object-fit: ${settings.iconFit || 'cover'}; opacity: ${settings.iconOpacity ?? 1}; mix-blend-mode: ${settings.iconBlend || 'normal'}; border-radius: inherit"
        />
      `;
    }
    if (settings.iconType === 'customSvg' && settings.customSvg) {
      return html`
        <cw-icon .customSvg="${settings.customSvg}" .size="${settings.iconWidth || 26}" .color="${settings.iconColor || '#ffffff'}"></cw-icon>
      `;
    }
    return html`
      <cw-icon
        .name="${settings.lucideIcon || settings.backgroundLucideIcon || 'MessageSquare'}"
        .size="${settings.iconWidth || 26}"
        .color="${settings.iconColor || '#ffffff'}"
      ></cw-icon>
    `;
  }

  private renderIconContainer(settings: Bubble) {
    return html`
      <div class="icon-container">
        ${this.panelOpen
          ? html`<cw-icon .name="${'ChevronDown'}" .size="${26}"></cw-icon>`
          : html`
              <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%">
                ${this.renderLauncherIcon(settings)}
              </div>
            `
        }
      </div>
    `;
  }

  private renderDots(settings: Bubble) {
    return html`
      <div class="dots-container" style="gap: ${(settings.dots?.spacing || 6)}px">
        ${[0, 1, 2].map(
          (i) => html`
            <span
              class="dot-span"
              style="width: ${(settings.dots?.size || 6)}px; height: ${(settings.dots?.size || 6)}px; background-color: ${settings.dots?.color || '#FFFFFF'}; animation: ${dotAnimation(settings.dots?.animation, i)}"
            ></span>
          `
        )}
      </div>
    `;
  }

  private renderTooltip(settings: Bubble) {
    const t = settings.tooltip;
    if (!t?.enabled || this.panelOpen || this.hasSentMessage) return '';
    return html`
      <cw-tooltip
        position="${t.position || 'left'}"
        .text="${t.text || 'Chat with us'}"
        .position="${(t.position || 'left') as any}"
        .backgroundColor="${t.backgroundColor || '#ffffff'}"
        .textColor="${t.textColor || '#374151'}"
        .fontSize="${t.fontSize || 14}"
        .padding="${t.padding || '8px 16px'}"
        .borderRadius="${t.borderRadius}"
        .boxShadow="${t.boxShadow || '0 4px 12px rgba(0,0,0,0.1)'}"
        .borderWidth="${t.borderWidth || 0}"
        .borderColor="${t.borderColor || 'transparent'}"
        .arrowEnabled="${t.arrowEnabled !== false}"
      ></cw-tooltip>
    `;
  }

  render() {
    const settings = this.config;

    if (!settings) return html``;
    if (settings.hideOnOpen && this.panelOpen) return html``;

    const widthVal = settings.width || 60;
    const heightVal = settings.height || 60;
    const borderRadius = getBorderRadius(settings.borderRadius);
    const bg = getCompositeBackground(settings);
    const boxShadow = [getBoxShadow(settings), getInnerShadow(settings as any)].filter(b => b && b !== 'none').join(', ') || 'none';

    const hoverScale = settings.hoverScale ?? 1.05;
    const transform = this.hovered && !this.panelOpen ? `scale(${hoverScale})` : 'scale(1.0)';
    const entryAnim = idleAnimationStyle(settings, this.hovered || this.panelOpen);
    const showHoverDots = !!(settings.dots?.animation && settings.dots.animation !== 'none' && this.hovered && !this.panelOpen);

    return html`
      <div
        class="bubble-wrapper"
        role="button"
        tabindex="0"
        aria-label="${this.panelOpen ? 'Close chat' : 'Open chat'}"
        style="position: ${this.fixed ? 'fixed' : 'absolute'}; width: ${widthVal}px; height: ${heightVal}px; max-width: calc(100% - 24px); max-height: calc(100% - 24px); ${placementStyle(settings)} border-radius: ${borderRadius}; background: ${bg}; background-blend-mode: ${settings.backgroundBlendMode || 'normal'}; box-shadow: ${boxShadow}; transform: ${transform}; ${borderStyle(settings)} ${glassStyle(settings)} ${neonStyle(settings)} ${entryAnim}"
        @mouseenter="${() => (this.hovered = true)}"
        @mouseleave="${() => (this.hovered = false)}"
        @click="${this.handleClick}"
        @keydown="${this.handleKeyDown}"
      >
        ${this.renderOverlays(settings)}

        ${showHoverDots ? this.renderDots(settings) : this.renderIconContainer(settings)}

        ${settings.outlineRing?.enabled
          ? html`
              <div
                style="position: absolute; inset: 0; pointer-events: none; border-radius: inherit; box-shadow: 0 0 0 ${(settings.outlineRing.width || 3)}px ${hexToRgba(settings.outlineRing.color || '#22d3ee', settings.outlineRing.opacity || 0.4)}"
              ></div>
            `
          : ''
        }

        ${this.unreadCount > 0
          ? html`<cw-badge .count="${this.unreadCount}" .config="${settings.badge}"></cw-badge>`
          : ''
        }

        ${this.renderTooltip(settings)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cw-bubble': CwBubble;
  }
}
