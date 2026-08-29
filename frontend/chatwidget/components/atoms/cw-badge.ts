import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CORE_STYLES } from '../../styles/core-styles.js';
import { REDUCED_MOTION_CSS } from '../../tokens/accessibility.js';

/**
 * cw-badge
 * Pure presentational atom for unread count indicator.
 * 100% domain-free with zero store type imports.
 */
@customElement('cw-badge')
export class CwBadge extends LitElement {
  @property({ type: Number }) count = 0;
  @property({ type: String }) position?: string;
  @property({ type: Number }) offsetX?: number;
  @property({ type: Number }) offsetY?: number;
  @property({ type: Number }) size?: number;
  @property({ type: String }) animation?: string;
  @property({ type: String }) backgroundColor?: string;
  @property({ type: String }) textColor?: string;
  @property({ type: Number }) fontSize?: number;
  @property({ type: Number }) borderWidth?: number;
  @property({ type: String }) borderColor?: string;
  @property() borderRadius?: number | string;
  @property({ type: String }) fontWeight?: string;
  @property({ type: String }) boxShadow?: string;
  @property({ type: String }) padding?: string;
  @property({ type: Object }) config?: Record<string, any>;

  static styles = [
    CORE_STYLES,
    REDUCED_MOTION_CSS,
    css`
      :host {
        display: inline-flex;
      }
      .badge {
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        white-space: nowrap;
      }

      @keyframes badgePulse {
        0% {
          transform: scale(0.95);
          box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7);
        }
        70% {
          transform: scale(1.05);
          box-shadow: 0 0 0 8px rgba(220, 38, 38, 0);
        }
        100% {
          transform: scale(0.95);
          box-shadow: 0 0 0 0 rgba(220, 38, 38, 0);
        }
      }

      @keyframes badgeBounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-4px); }
      }

      @keyframes badgeWiggle {
        0%, 100% { transform: rotate(0deg); }
        25% { transform: rotate(-10deg); }
        75% { transform: rotate(10deg); }
      }
    `,
  ];

  render() {
    if (!this.count || this.count <= 0) return html``;

    const b = this.config || {};
    const pos = this.position || b.position || 'top-right';
    const offsetX = this.offsetX !== undefined ? this.offsetX : (b.offsetX !== undefined ? b.offsetX : -6);
    const offsetY = this.offsetY !== undefined ? this.offsetY : (b.offsetY !== undefined ? b.offsetY : -6);
    const badgeSize = this.size || b.size || 20;

    let animCss = this.animation || b.animation || 'none';
    if (animCss === 'pulse') {
      animCss = 'badgePulse 1.5s ease-in-out infinite';
    } else if (animCss === 'bounce') {
      animCss = 'badgeBounce 1s infinite';
    } else if (animCss === 'wiggle') {
      animCss = 'badgeWiggle 2.5s ease-in-out infinite';
    } else if (animCss.includes('pulse')) {
      animCss = animCss.replace(/pulse/g, 'badgePulse');
    } else if (animCss.includes('bounce')) {
      animCss = animCss.replace(/bounce/g, 'badgeBounce');
    } else if (animCss.includes('wiggle')) {
      animCss = animCss.replace(/wiggle/g, 'badgeWiggle');
    }

    const isRelative = pos === 'relative' || pos === 'static';

    const rawShadow = this.boxShadow || b.boxShadow;
    let shadowVal = '0 1px 3px rgba(0,0,0,0.15)';
    if (rawShadow) {
      shadowVal = rawShadow.includes('px') || rawShadow === 'none' ? rawShadow : `0 2px 6px ${rawShadow}`;
    }

    const rawPadding = this.padding !== undefined ? this.padding : b.padding;
    const paddingVal = rawPadding !== undefined ? (typeof rawPadding === 'number' ? `${rawPadding}px` : rawPadding) : '0 4px';

    const rawRadius = this.borderRadius !== undefined ? this.borderRadius : b.borderRadius;
    const radiusVal = rawRadius !== undefined ? (typeof rawRadius === 'number' ? `${rawRadius}px` : rawRadius) : '9999px';

    const styleObj: Record<string, string> = {
      position: isRelative ? pos : 'absolute',
      backgroundColor: this.backgroundColor || b.backgroundColor || 'var(--cw-error, #f43f5e)',
      color: this.textColor || b.textColor || '#ffffff',
      fontSize: `${this.fontSize || b.fontSize || 11}px`,
      lineHeight: '1',
      minWidth: `${badgeSize}px`,
      height: `${badgeSize}px`,
      border: `${this.borderWidth !== undefined ? this.borderWidth : (b.borderWidth !== undefined ? b.borderWidth : 2)}px solid ${this.borderColor || b.borderColor || '#ffffff'}`,
      borderRadius: radiusVal,
      fontWeight: this.fontWeight || b.fontWeight || '700',
      boxShadow: shadowVal,
      padding: paddingVal,
      zIndex: '50',
      animation: animCss,
    };

    if (!isRelative) {
      if (pos === 'top-left') {
        styleObj.top = `${offsetY}px`;
        styleObj.left = `${offsetX}px`;
      } else if (pos === 'bottom-right') {
        styleObj.bottom = `${offsetY}px`;
        styleObj.right = `${offsetX}px`;
      } else if (pos === 'bottom-left') {
        styleObj.bottom = `${offsetY}px`;
        styleObj.left = `${offsetX}px`;
      } else {
        styleObj.top = `${offsetY}px`;
        styleObj.right = `${offsetX}px`;
      }
    }

    const cssString = Object.entries(styleObj)
      .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v}`)
      .join('; ');

    return html`<div class="badge" style="${cssString}">${this.count}</div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cw-badge': CwBadge;
  }
}
