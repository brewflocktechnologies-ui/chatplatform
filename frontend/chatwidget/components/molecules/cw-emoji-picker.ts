import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { REDUCED_MOTION_CSS } from '../../tokens/accessibility.js';
import { DismissController } from '../../utils/dismiss.js';

const DEFAULT_EMOJIS = ['😀', '😂', '😊', '😍', '👍', '👎', '🙏', '🎉', '❤️', '😢', '😮', '👌'];

function parseEmojiInput(val: string[] | string | undefined | null): string[] {
  if (!val) return DEFAULT_EMOJIS;
  if (Array.isArray(val)) {
    return val.map((s) => String(s).trim()).filter(Boolean);
  }
  const str = String(val).trim();
  if (!str) return DEFAULT_EMOJIS;

  if (str.includes(',')) {
    return str.split(',').map((s) => s.trim()).filter(Boolean);
  }

  if (/\s+/.test(str)) {
    return str.split(/\s+/).map((s) => s.trim()).filter(Boolean);
  }

  try {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    const segments = [...segmenter.segment(str)].map((s) => s.segment.trim()).filter(Boolean);
    if (segments.length > 0) return segments;
  } catch (e) {
    return Array.from(str).map((s) => s.trim()).filter(Boolean);
  }

  return DEFAULT_EMOJIS;
}

/**
 * cw-emoji-picker
 * Pure presentational molecule representing an emoji selection grid popup.
 * Emits `cw:insert-emoji` composed bubbling custom event on selection.
 * Listens for outside pointer clicks to close popup via DismissController.
 */
@customElement('cw-emoji-picker')
export class CwEmojiPicker extends LitElement {
  @property() emojis: string[] | string = DEFAULT_EMOJIS;

  private dismiss = new DismissController(this);

  static styles = [
    REDUCED_MOTION_CSS,
    css`
      :host {
        display: block;
        position: absolute;
        bottom: 85px;
        right: 16px;
        z-index: 60;
      }
      .emoji-row {
        background: var(--cw-surface, #ffffff);
        border: 1px solid var(--cw-border, #e5e7eb);
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 4px;
        padding: 8px;
        box-sizing: border-box;
      }
      .emoji-btn {
        border: none;
        background: transparent;
        font-size: 18px;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s ease;
        white-space: nowrap;
        word-break: keep-all;
        box-sizing: border-box;
      }
      .emoji-btn:hover {
        background: rgba(0, 0, 0, 0.05);
      }
    `,
  ];

  private selectEmoji(emoji: string) {
    this.dispatchEvent(
      new CustomEvent('cw:insert-emoji', {
        detail: emoji,
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const list = parseEmojiInput(this.emojis);

    return html`
      <div class="emoji-row" role="dialog" aria-label="Emoji Picker">
        ${list.map(
          (e) => html`
            <button type="button" class="emoji-btn" @click="${() => this.selectEmoji(e)}">${e}</button>
          `
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cw-emoji-picker': CwEmojiPicker;
  }
}
