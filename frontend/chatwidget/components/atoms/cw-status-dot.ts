import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { REDUCED_MOTION_CSS } from '../../tokens/accessibility.js';

@customElement('cw-status-dot')
export class CwStatusDot extends LitElement {
  @property({ type: Number }) size = 8;
  @property({ type: String }) color = 'var(--cw-success, #22c55e)';
  @property({ type: Boolean }) animated = true;
  @property({ type: Number }) borderWidth = 0;
  @property({ type: String }) borderColor = '#ffffff';

  static styles = [
    REDUCED_MOTION_CSS,
    css`
      :host {
        display: inline-flex;
        position: relative;
        align-items: center;
        justify-content: center;
      }
      .dot-wrapper {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .dot-pulse {
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        opacity: 0.6;
        pointer-events: none;
        animation: statusPulse 1.8s cubic-bezier(0.24, 0, 0.38, 1) infinite;
      }
      .dot-solid {
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        box-sizing: border-box;
      }

      @keyframes statusPulse {
        0% { transform: scale(0.9); opacity: 0.65; }
        50% { transform: scale(1.6); opacity: 0.3; }
        100% { transform: scale(2.4); opacity: 0; }
      }
    `,
  ];

  render() {
    return html`
      <div class="dot-wrapper" style="width: ${this.size}px; height: ${this.size}px">
        ${this.animated ? html`<span class="dot-pulse" style="background-color: ${this.color}"></span>` : ''}
        <span class="dot-solid" style="background-color: ${this.color}; border: ${this.borderWidth}px solid ${this.borderColor}"></span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cw-status-dot': CwStatusDot;
  }
}
