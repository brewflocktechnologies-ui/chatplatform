import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { REDUCED_MOTION_CSS } from '../../tokens/accessibility.js';
import './cw-icon.js';

/**
 * cw-menu-item
 * Pure presentational atom for popup menu rows.
 * Renders icon, label, and slot for optional trailing content.
 */
@customElement('cw-menu-item')
export class CwMenuItem extends LitElement {
  @property({ type: String }) icon = '';
  @property({ type: String }) label = '';
  @property({ type: Number }) iconSize = 16;

  static styles = [
    REDUCED_MOTION_CSS,
    css`
      :host {
        display: block;
        width: 100%;
      }
      .menu-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border: none;
        background: transparent;
        color: var(--cw-ink, #18181b);
        font-size: 13px;
        cursor: pointer;
        border-radius: 8px;
        text-align: left;
        width: 100%;
        box-sizing: border-box;
        transition: background 0.15s ease;
        font-family: inherit;
      }
      .menu-item:hover {
        background: rgba(0, 0, 0, 0.05);
      }
      .menu-item:focus-visible {
        outline: 2px solid var(--cw-accent, #0b5fff);
        outline-offset: -2px;
      }
      .label-text {
        flex: 1;
        min-width: 0;
      }
    `,
  ];

  render() {
    return html`
      <button type="button" class="menu-item" role="menuitem">
        ${this.icon ? html`<cw-icon .name="${this.icon}" .size="${this.iconSize}"></cw-icon>` : ''}
        <span class="label-text">${this.label}</span>
        <slot></slot>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cw-menu-item': CwMenuItem;
  }
}
