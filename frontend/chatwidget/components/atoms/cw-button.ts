import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { CORE_STYLES } from '../../styles/core-styles.js';
import { REDUCED_MOTION_CSS } from '../../tokens/accessibility.js';
import './cw-icon.js';

const ICON_SIZE_BY_BUTTON_SIZE: Readonly<Record<string, number>> = { xs: 12, sm: 14, lg: 20 };
const DEFAULT_ICON_SIZE = 16;

/** An explicit icon size wins (0 counts as "not set"); otherwise it follows the button size. */
function resolveIconSize(explicit: number | undefined, buttonSize: string): number {
  if (explicit) return explicit;
  return Object.hasOwn(ICON_SIZE_BY_BUTTON_SIZE, buttonSize) ? ICON_SIZE_BY_BUTTON_SIZE[buttonSize] : DEFAULT_ICON_SIZE;
}

type ButtonBox = {
  bg: string;
  color: string;
  borderColor: string;
  padding: string;
  borderRadius: string | number;
  fullWidth: boolean;
  width?: number;
  height?: number;
};

/** Inline-style overrides for the button, as a `prop: value; ...` string. */
function buildButtonStyle(box: ButtonBox): string {
  const style: Record<string, string> = {};
  if (box.bg) style.backgroundColor = box.bg;
  if (box.color) style.color = box.color;
  if (box.borderColor) style.borderColor = box.borderColor;
  if (box.padding) style.padding = box.padding;
  if (box.borderRadius) {
    style.borderRadius = typeof box.borderRadius === 'number' ? `${box.borderRadius}px` : box.borderRadius;
  }
  if (box.fullWidth) style.width = '100%';
  if (box.width !== undefined) style.width = `${box.width}px`;
  if (box.height !== undefined) style.height = `${box.height}px`;
  else if (box.padding) style.height = 'auto';

  return Object.entries(style)
    .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v}`)
    .join('; ');
}

@customElement('cw-button')
export class CwButton extends LitElement {
  @property({ type: String }) variant: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'icon' = 'primary';
  @property({ type: String }) size: 'xs' | 'sm' | 'md' | 'lg' = 'md';
  @property({ type: Boolean }) disabled = false;
  @property({ type: String }) type: 'button' | 'submit' | 'reset' = 'button';
  @property({ type: String }) label = '';
  @property({ type: String }) override ariaLabel: string | null = null;
  @property({ type: String }) icon = '';
  @property({ type: String }) iconPosition: 'left' | 'right' | 'only' = 'left';
  @property({ type: Number }) iconSize?: number;
  @property({ type: String }) bg = '';
  @property({ type: String }) color = '';
  @property({ type: String }) borderColor = '';
  @property({ type: String }) borderRadius = '9999px';
  @property({ type: Boolean }) fullWidth = false;
  @property({ type: Boolean }) elevatable = false;
  @property({ type: Boolean }) scalable = false;
  @property({ type: String }) padding = '';
  @property({ type: Number }) width?: number;
  @property({ type: Number }) height?: number;

  static readonly styles = [
    CORE_STYLES,
    REDUCED_MOTION_CSS,
    css`
      :host {
        display: inline-block;
      }
      :host([fullWidth]),
      :host([full-width]) {
        display: block;
        width: 100%;
      }
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-family: inherit;
        font-weight: 600;
        cursor: pointer;
        border: 1px solid transparent;
        box-sizing: border-box;
        text-decoration: none;
        white-space: nowrap;
        transition: all 0.2s ease;
        outline: none;
        user-select: none;
      }
      .btn.elevatable {
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease, background-color 0.2s;
      }
      .btn.elevatable:hover {
        transform: translateY(-4px);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      }
      .btn.scalable {
        transition: transform 0.2s ease, background-color 0.2s ease, filter 0.2s ease;
      }
      .btn.scalable:hover {
        transform: scale(1.05);
      }
      .btn:focus-visible {
        outline: 2px solid var(--cw-accent, #0b5fff);
        outline-offset: 2px;
      }
      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        pointer-events: none;
      }

      /* Sizes */
      .size-xs {
        font-size: 11px;
        padding: 4px 8px;
        height: 30px;
      }
      .size-sm {
        font-size: 12px;
        padding: 6px 12px;
        height: 32px;
      }
      .size-md {
        font-size: 14px;
        padding: 10px 18px;
        height: 40px;
      }
      .size-lg {
        font-size: 15px;
        padding: 14px 24px;
        height: 48px;
      }

      /* Icon variants sizes */
      .variant-icon.size-xs {
        padding: 0;
        width: 30px;
        height: 30px;
      }
      .variant-icon.size-sm {
        padding: 0;
        width: 32px;
        height: 32px;
      }
      .variant-icon.size-md {
        padding: 0;
        width: 40px;
        height: 40px;
      }
      .variant-icon.size-lg {
        padding: 0;
        width: 48px;
        height: 48px;
      }

      /* Variants */
      .variant-primary {
        background-color: var(--cw-accent, #0b5fff);
        color: #ffffff;
      }
      .variant-primary:hover {
        filter: brightness(1.08);
      }

      .variant-secondary {
        background-color: var(--cw-surface, #f1f5f9);
        color: var(--cw-ink, #1e293b);
      }
      .variant-secondary:hover {
        background-color: #e2e8f0;
      }

      .variant-ghost {
        background: transparent;
        color: var(--cw-ink, #1e293b);
      }
      .variant-ghost:hover {
        background: rgba(0, 0, 0, 0.05);
      }

      .variant-outline {
        background: transparent;
        border-color: var(--cw-border, #cbd5e1);
        color: var(--cw-ink, #1e293b);
      }
      .variant-outline:hover {
        background: rgba(0, 0, 0, 0.04);
        border-color: #94a3b8;
      }

      .variant-danger {
        background-color: var(--cw-error, #ef4444);
        color: #ffffff;
      }
      .variant-danger:hover {
        filter: brightness(1.08);
      }

      .variant-icon {
        background: transparent;
        color: var(--cw-ink, #1e293b);
        border-radius: 50%;
      }
      .variant-icon:hover {
        background: rgba(0, 0, 0, 0.06);
      }
    `,
  ];

  /** Accessible name: explicit label, then the visible label, then the icon name for icon-only buttons. */
  private resolveAriaLabel(isIconOnly: boolean): string | undefined {
    if (this.ariaLabel) return this.ariaLabel;
    if (this.label) return this.label;
    return isIconOnly ? this.icon || 'button' : undefined;
  }

  render() {
    const isIconOnly = this.variant === 'icon' || this.iconPosition === 'only' || (!this.label && !!this.icon);
    const iconSize = resolveIconSize(this.iconSize, this.size);
    const showLeadingIcon = !!this.icon && (this.iconPosition === 'left' || isIconOnly);
    const showTrailingIcon = !!this.icon && this.iconPosition === 'right' && !isIconOnly;
    const cssString = buildButtonStyle(this);

    return html`
      <button
        type="${this.type}"
        class="btn variant-${this.variant} size-${this.size} ${this.elevatable ? 'elevatable' : ''} ${this.scalable ? 'scalable' : ''}"
        style="${cssString}"
        ?disabled="${this.disabled}"
        aria-label="${ifDefined(this.resolveAriaLabel(isIconOnly))}"
      >
        ${showLeadingIcon
        ? html`<cw-icon .name="${this.icon}" .size="${iconSize}"></cw-icon>`
        : ''
      }

        ${!isIconOnly && this.label ? html`<span>${this.label}</span>` : ''}
        <slot></slot>

        ${showTrailingIcon
        ? html`<cw-icon .name="${this.icon}" .size="${iconSize}"></cw-icon>`
        : ''
      }
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cw-button': CwButton;
  }
}
