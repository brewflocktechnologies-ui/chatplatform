import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CORE_STYLES } from '../../styles/core-styles.js';
import { REDUCED_MOTION_CSS } from '../../tokens/accessibility.js';
import { getTooltipBorderRadius, type BorderRadiusConfig } from '../../utils/style-helpers.js';

@customElement('cw-tooltip')
export class CwTooltip extends LitElement {
  @property({ type: String }) text = 'Chat with us';
  @property({ type: String, reflect: true }) position: 'left' | 'right' | 'top' | 'bottom' = 'left';
  @property({ type: String }) backgroundColor = '#ffffff';
  @property({ type: String }) textColor = '#374151';
  @property({ type: Number }) fontSize = 14;
  @property({ type: String }) padding = '8px 16px';
  @property({ type: Object }) borderRadius?: number | BorderRadiusConfig;
  @property({ type: String }) boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
  @property({ type: Number }) borderWidth = 0;
  @property({ type: String }) borderColor = 'transparent';
  @property({ type: Boolean }) arrowEnabled = true;
  @property({ type: Boolean }) visible = true;

  static styles = [
    CORE_STYLES,
    REDUCED_MOTION_CSS,
    css`
      :host {
        position: absolute;
        z-index: 100;
        pointer-events: auto;
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      /* Host positioning relative to parent anchor */
      :host([position="left"]),
      :host(:not([position])) {
        right: calc(100% + 12px);
        top: 50%;
        transform: translateY(-50%);
      }

      :host([position="right"]) {
        left: calc(100% + 12px);
        top: 50%;
        transform: translateY(-50%);
      }

      :host([position="top"]) {
        bottom: calc(100% + 12px);
        left: 50%;
        transform: translateX(-50%);
      }

      :host([position="bottom"]) {
        top: calc(100% + 12px);
        left: 50%;
        transform: translateX(-50%);
      }

      .tooltip-box {
        position: relative;
        white-space: nowrap;
        box-sizing: border-box;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1.35;
        font-family: inherit;
        transition: opacity 0.2s ease, transform 0.2s ease;
      }

      .tooltip-arrow {
        position: absolute;
        box-sizing: border-box;
        pointer-events: none;
        width: 8px;
        height: 8px;
      }
    `
  ];

  render() {
    if (!this.visible || !this.text) return html``;

    const pos = this.position || 'left';
    const tBorderRadius = getTooltipBorderRadius(this.borderRadius, pos);
    const arrowSize = 8;
    const tPadding = typeof this.padding === 'number' ? `${this.padding}px` : (this.padding || '8px 16px');
    const rawShadow = this.boxShadow;
    let tBoxShadow = '0 4px 12px rgba(0,0,0,0.1)';
    if (rawShadow) {
      tBoxShadow = rawShadow.includes('px') || rawShadow === 'none' ? rawShadow : `0 4px 12px ${rawShadow}`;
    }
    const tBorderW = Math.max(0, this.borderWidth || 0);
    const tBorderC = this.borderColor || 'transparent';

    let arrowPosStyle = '';

    if (pos === 'left') {
      arrowPosStyle = `right: -${arrowSize / 2}px; top: 50%; transform: translateY(-50%) rotate(45deg);`;
      if (tBorderW > 0) arrowPosStyle += ` border-top: ${tBorderW}px solid ${tBorderC}; border-right: ${tBorderW}px solid ${tBorderC};`;
    } else if (pos === 'right') {
      arrowPosStyle = `left: -${arrowSize / 2}px; top: 50%; transform: translateY(-50%) rotate(45deg);`;
      if (tBorderW > 0) arrowPosStyle += ` border-bottom: ${tBorderW}px solid ${tBorderC}; border-left: ${tBorderW}px solid ${tBorderC};`;
    } else if (pos === 'top') {
      arrowPosStyle = `bottom: -${arrowSize / 2}px; left: 50%; transform: translateX(-50%) rotate(45deg);`;
      if (tBorderW > 0) arrowPosStyle += ` border-bottom: ${tBorderW}px solid ${tBorderC}; border-right: ${tBorderW}px solid ${tBorderC};`;
    } else {
      arrowPosStyle = `top: -${arrowSize / 2}px; left: 50%; transform: translateX(-50%) rotate(45deg);`;
      if (tBorderW > 0) arrowPosStyle += ` border-top: ${tBorderW}px solid ${tBorderC}; border-left: ${tBorderW}px solid ${tBorderC};`;
    }

    return html`
      <div
        class="tooltip-box"
        style="background-color: ${this.backgroundColor}; color: ${this.textColor}; font-size: ${this.fontSize}px; padding: ${tPadding}; border-radius: ${tBorderRadius}; box-shadow: ${tBoxShadow}; border: ${tBorderW}px solid ${tBorderC}"
      >
        <span>${this.text}</span>
        ${this.arrowEnabled !== false
          ? html`
              <div
                class="tooltip-arrow"
                style="background-color: ${this.backgroundColor}; ${arrowPosStyle}"
              ></div>
            `
          : ''
        }
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cw-tooltip': CwTooltip;
  }
}
