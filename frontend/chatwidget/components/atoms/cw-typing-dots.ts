import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { REDUCED_MOTION_CSS } from '../../tokens/accessibility.js';

@customElement('cw-typing-dots')
export class CwTypingDots extends LitElement {
  static styles = [
    REDUCED_MOTION_CSS,
    css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 8px;
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: currentColor;
      animation: typingBounce 1.4s infinite ease-in-out;
    }
    .dot:nth-child(1) {
      animation-delay: 0s;
    }
    .dot:nth-child(2) {
      animation-delay: 0.2s;
    }
    .dot:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes typingBounce {
      0%, 60%, 100% {
        transform: translateY(0);
        opacity: 0.4;
      }
      30% {
        transform: translateY(-4px);
        opacity: 1;
      }
    }
  `,
  ];

  render() {
    return html`
      <span class="dot"></span>
      <span class="dot"></span>
      <span class="dot"></span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cw-typing-dots': CwTypingDots;
  }
}
