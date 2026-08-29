import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { REDUCED_MOTION_CSS } from '../../tokens/accessibility.js';
import { DismissController } from '../../utils/dismiss.js';
import '../atoms/cw-menu-item.js';

/**
 * cw-chat-menu
 * Pure presentational molecule representing the chat options popup menu.
 * Dispatches events and closes popup on outside click via DismissController.
 */
@customElement('cw-chat-menu')
export class CwChatMenu extends LitElement {
  @property({ type: Boolean }) soundsOn = true;

  private dismiss = new DismissController(this);

  static styles = [
    REDUCED_MOTION_CSS,
    css`
      :host {
        display: block;
        position: absolute;
        top: 8px;
        right: 16px;
        z-index: 60;
      }
      .menu-pop {
        background: var(--cw-surface, #ffffff);
        border: 1px solid var(--cw-border, #e5e7eb);
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
        display: flex;
        flex-direction: column;
        padding: 4px;
        min-width: 170px;
        box-sizing: border-box;
      }
    `,
  ];

  private onDownloadTranscript() {
    this.dispatchEvent(new CustomEvent('cw:download-transcript', { bubbles: true, composed: true }));
    this.dispatchEvent(new CustomEvent('cw:close-popups', { bubbles: true, composed: true }));
  }

  private onToggleSounds() {
    this.dispatchEvent(new CustomEvent('cw:toggle-sounds', { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <div class="menu-pop" role="menu" aria-label="Chat options">
        <cw-menu-item icon="Download" label="Download transcript" @click="${this.onDownloadTranscript}"></cw-menu-item>
        <cw-menu-item icon="Volume2" label="Sounds: ${this.soundsOn ? 'ON' : 'OFF'}" @click="${this.onToggleSounds}"></cw-menu-item>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cw-chat-menu': CwChatMenu;
  }
}
