import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { REDUCED_MOTION_CSS } from '../../tokens/accessibility.js';
import { DismissController } from '../../utils/dismiss.js';
import '../atoms/cw-menu-item.js';

/**
 * cw-attach-menu
 * Pure presentational molecule representing the attachment popup menu.
 * Dispatches events and closes popup on outside click via DismissController.
 */
@customElement('cw-attach-menu')
export class CwAttachMenu extends LitElement {
  private dismiss = new DismissController(this);

  static styles = [
    REDUCED_MOTION_CSS,
    css`
      :host {
        display: block;
        position: absolute;
        bottom: 85px;
        left: 16px;
        z-index: 60;
      }
      .attach-pop {
        background: var(--cw-surface, #ffffff);
        border: 1px solid var(--cw-border, #e5e7eb);
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
        display: flex;
        flex-direction: column;
        padding: 4px;
        min-width: 160px;
        box-sizing: border-box;
      }
    `,
  ];

  private onSelectImage() {
    this.dispatchEvent(new CustomEvent('cw:trigger-file-select', { bubbles: true, composed: true }));
    this.dispatchEvent(new CustomEvent('cw:close-popups', { bubbles: true, composed: true }));
  }

  private onCaptureScreenshot() {
    this.dispatchEvent(new CustomEvent('cw:capture-screenshot', { bubbles: true, composed: true }));
    this.dispatchEvent(new CustomEvent('cw:close-popups', { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <div class="attach-pop" role="menu" aria-label="Attachment options">
        <cw-menu-item icon="Image" label="Send an image" @click="${this.onSelectImage}"></cw-menu-item>
        <cw-menu-item icon="Camera" label="Add screenshot" @click="${this.onCaptureScreenshot}"></cw-menu-item>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cw-attach-menu': CwAttachMenu;
  }
}
