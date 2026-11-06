import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CORE_STYLES } from '../../styles/core-styles.js';
import { REDUCED_MOTION_CSS } from '../../tokens/accessibility.js';
import { getTooltipBorderRadius, type BorderRadiusConfig } from '../../utils/style-helpers.js';

const ARROW_SIZE = 8;
const DEFAULT_TOOLTIP_SHADOW = '0 4px 12px rgba(0,0,0,0.1)';

/** Numbers are pixels; an empty value falls back to the default padding. */
function resolveTooltipPadding(raw: string | number | undefined): string {
  if (typeof raw === 'number') return `${raw}px`;
  return raw || '8px 16px';
}

/** A bare colour becomes a soft drop shadow; a full shadow value (or `none`) is used as-is. */
function resolveTooltipShadow(raw: string | undefined): string {
  if (!raw) return DEFAULT_TOOLTIP_SHADOW;
  return raw.includes('px') || raw === 'none' ? raw : `0 4px 12px ${raw}`;
}

type ArrowPlacement = {
  /** Where the arrow sits on the box, given half its size. */
  place: (half: number) => string;
  /** The two edges that face the tooltip box and carry the border. */
  borderEdges: readonly [string, string];
};

const ARROW_PLACEMENTS: ReadonlyMap<string, ArrowPlacement> = new Map([
  ['left', { place: (h) => `right: -${h}px; top: 50%; transform: translateY(-50%) rotate(45deg);`, borderEdges: ['top', 'right'] }],
  ['right', { place: (h) => `left: -${h}px; top: 50%; transform: translateY(-50%) rotate(45deg);`, borderEdges: ['bottom', 'left'] }],
  ['top', { place: (h) => `bottom: -${h}px; left: 50%; transform: translateX(-50%) rotate(45deg);`, borderEdges: ['bottom', 'right'] }],
  ['bottom', { place: (h) => `top: -${h}px; left: 50%; transform: translateX(-50%) rotate(45deg);`, borderEdges: ['top', 'left'] }],
]);

/** Inline style that positions (and, with a border, outlines) the arrow for a tooltip side. */
function buildArrowStyle(position: string, borderWidth: number, borderColor: string): string {
  // Any unrecognised position is treated like "bottom", as before.
  const placement = ARROW_PLACEMENTS.get(position) ?? (ARROW_PLACEMENTS.get('bottom') as ArrowPlacement);
  let style = placement.place(ARROW_SIZE / 2);
  if (borderWidth > 0) {
    for (const edge of placement.borderEdges) {
      style += ` border-${edge}: ${borderWidth}px solid ${borderColor};`;
    }
  }
  return style;
}

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

  static readonly styles = [
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
    const tPadding = resolveTooltipPadding(this.padding);
    const tBoxShadow = resolveTooltipShadow(this.boxShadow);
    const tBorderW = Math.max(0, this.borderWidth || 0);
    const tBorderC = this.borderColor || 'transparent';
    const arrowPosStyle = buildArrowStyle(pos, tBorderW, tBorderC);

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
