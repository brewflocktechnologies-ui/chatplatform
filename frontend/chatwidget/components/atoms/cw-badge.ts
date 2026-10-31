import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CORE_STYLES } from '../../styles/core-styles.js';
import { REDUCED_MOTION_CSS } from '../../tokens/accessibility.js';

const NAMED_ANIMATIONS: Readonly<Record<string, string>> = {
  pulse: 'badgePulse 1.5s ease-in-out infinite',
  bounce: 'badgeBounce 1s infinite',
  wiggle: 'badgeWiggle 2.5s ease-in-out infinite',
};

// Order matters: the first alias found in a custom animation string wins.
const ANIMATION_ALIASES: ReadonlyArray<readonly [string, string]> = [
  ['pulse', 'badgePulse'],
  ['bounce', 'badgeBounce'],
  ['wiggle', 'badgeWiggle'],
];

/** Maps the short names (and names embedded in a custom string) to the keyframes defined below. */
function resolveAnimation(raw: string): string {
  if (Object.hasOwn(NAMED_ANIMATIONS, raw)) return NAMED_ANIMATIONS[raw];
  const alias = ANIMATION_ALIASES.find(([name]) => raw.includes(name));
  return alias ? raw.replaceAll(alias[0], alias[1]) : raw;
}

/** First truthy value: the property, then the config, then the default (0 and '' fall through). */
function firstTruthy<T>(own: T | undefined, fromConfig: T | undefined, fallback: T): T {
  return own || fromConfig || fallback;
}

/** First defined value: like firstTruthy, but 0 and '' count as real values. */
function firstDefined<T>(own: T | null | undefined, fromConfig: T | null | undefined, fallback: T): T {
  return own ?? fromConfig ?? fallback;
}

const DEFAULT_SHADOW = '0 1px 3px rgba(0,0,0,0.15)';

/** A bare colour becomes a soft drop shadow; a full shadow value (or `none`) is used as-is. */
function resolveShadow(raw?: string): string {
  if (!raw) return DEFAULT_SHADOW;
  return raw.includes('px') || raw === 'none' ? raw : `0 2px 6px ${raw}`;
}

/** Numbers are pixels; strings pass through; nothing falls back. */
function toCssLength(raw: number | string | null | undefined, fallback: string): string {
  if (raw === undefined || raw === null) return fallback;
  return typeof raw === 'number' ? `${raw}px` : raw;
}

// [vertical edge, horizontal edge] for each corner; anything else is top-right.
const CORNERS: ReadonlyMap<string, readonly [string, string]> = new Map([
  ['top-left', ['top', 'left']],
  ['bottom-right', ['bottom', 'right']],
  ['bottom-left', ['bottom', 'left']],
]);

function cornerOffsets(pos: string, offsetX: number, offsetY: number): Record<string, string> {
  const [vertical, horizontal] = CORNERS.get(pos) ?? ['top', 'right'];
  return { [vertical]: `${offsetY}px`, [horizontal]: `${offsetX}px` };
}

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

  static readonly styles = [
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
    const pos: string = firstTruthy(this.position, b.position, 'top-right');
    const badgeSize: number = firstTruthy(this.size, b.size, 20);
    const isRelative = pos === 'relative' || pos === 'static';
    const borderWidth: number = firstDefined(this.borderWidth, b.borderWidth, 2);

    const styleObj: Record<string, string> = {
      position: isRelative ? pos : 'absolute',
      backgroundColor: firstTruthy(this.backgroundColor, b.backgroundColor, 'var(--cw-error, #f43f5e)'),
      color: firstTruthy(this.textColor, b.textColor, '#ffffff'),
      fontSize: `${firstTruthy(this.fontSize, b.fontSize, 11)}px`,
      lineHeight: '1',
      minWidth: `${badgeSize}px`,
      height: `${badgeSize}px`,
      border: `${borderWidth}px solid ${firstTruthy(this.borderColor, b.borderColor, '#ffffff')}`,
      borderRadius: toCssLength(firstDefined(this.borderRadius, b.borderRadius, undefined), '9999px'),
      fontWeight: firstTruthy(this.fontWeight, b.fontWeight, '700'),
      boxShadow: resolveShadow(this.boxShadow || b.boxShadow),
      padding: toCssLength(firstDefined(this.padding, b.padding, undefined), '0 4px'),
      zIndex: '50',
      animation: resolveAnimation(firstTruthy(this.animation, b.animation, 'none')),
    };

    if (!isRelative) {
      const offsetX: number = firstDefined(this.offsetX, b.offsetX, -6);
      const offsetY: number = firstDefined(this.offsetY, b.offsetY, -6);
      Object.assign(styleObj, cornerOffsets(pos, offsetX, offsetY));
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
