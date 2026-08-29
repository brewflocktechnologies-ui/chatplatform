import { LitElement, html, css, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { InputBoxConfig } from '../../store/types.js';
import { EnterLeaveController } from '../../utils/transition.js';
import { REDUCED_MOTION_CSS } from '../../tokens/accessibility.js';
import '../atoms/cw-icon.js';
import '../atoms/cw-button.js';

/**
 * cw-greet-input
 * Pure presentational molecule. Mirrors keystrokes via `cw:greet-input`
 * and submits via `cw:greet-submit`. Never touches the store.
 */
@customElement('cw-greet-input')
export class CwGreetInput extends LitElement {
  @property({ type: Object }) config?: InputBoxConfig;
  @property({ type: String }) accentColor = '#9333EA';
  @property({ type: Boolean }) visible = true;

  @state() draft = '';

  private transition = new EnterLeaveController(this, {
    enterMs: () => (this.config?.animationOpeningSec !== undefined ? this.config.animationOpeningSec : 0.3) * 1000,
    leaveMs: () => 0,
  });

  static styles = [
    REDUCED_MOTION_CSS,
    css`
    :host {
      display: block;
      width: 100%;
    }
    .input-container {
      display: flex;
      align-items: center;
      width: 100%;
      position: relative;
      pointer-events: auto;
      box-sizing: border-box;
    }
    input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      width: 100%;
      font-size: 14px;
      font-family: inherit;
    }
    button {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border: none;
      cursor: pointer;
      transition: transform 0.2s;
    }
    button:hover {
      transform: scale(1.05);
    }
  `,
  ];

  private emit(name: string, detail?: unknown) {
    this.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true, composed: true })
    );
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      this.submit();
    }
  }

  private handleInput(e: Event) {
    this.draft = (e.target as HTMLInputElement).value;
    this.emit('cw:greet-input', this.draft);
  }

  private submit() {
    this.emit('cw:greet-submit', this.draft.trim());
    this.draft = '';
    this.requestUpdate();
  }

  protected willUpdate(_changed: PropertyValues<this>) {
    super.willUpdate(_changed);
    const isVis = this.config?.visible !== false && this.visible !== false;
    const visible = !!(this.config && this.config.enabled && isVis);
    this.transition.setTarget(visible);
  }

  render() {
    if (!this.transition.render || !this.config || !this.config.enabled) return html``;

    const ib = this.config;
    const isSeparated = ib.layout === 'separated';

    const phase = this.transition.phase;
    const isHidden = phase === 'enter';
    const openingSec = ib.animationOpeningSec !== undefined ? ib.animationOpeningSec : 0.3;
    const phaseStyle =
      `opacity: ${isHidden ? '0' : '1'}; ` +
      `transform: ${isHidden ? 'translateY(8px)' : 'translateY(0)'}; ` +
      `transition: opacity ${openingSec}s ease, transform ${openingSec}s ease;`;

    const borderRadiusCss = ib.borderRadius !== undefined
      ? (typeof ib.borderRadius === 'number' ? `${ib.borderRadius}px` : ib.borderRadius)
      : '24px';

    if (isSeparated) {
      const btnBg = ib.buttonBgColor || ib.buttonColor || this.accentColor || 'var(--cw-accent, #0b5fff)';
      let btnIconColor = ib.buttonIconColor || '#ffffff';
      if (btnIconColor.toLowerCase() === btnBg.toLowerCase() || btnBg !== '#ffffff') {
        btnIconColor = '#ffffff';
      }
      const btnSize = ib.buttonSize || 42;

      return html`
        <div class="input-container" style="gap: 8px; ${phaseStyle}">
          <div
            style="flex: 1; background-color: ${ib.backgroundColor || '#ffffff'}; border-radius: ${borderRadiusCss}; box-shadow: ${ib.boxShadow || '0 6px 16px rgba(0,0,0,0.12)'}; padding: 10px 16px; display: flex; align-items: center"
          >
            <input
              type="text"
              aria-label="Message"
              .value="${this.draft}"
              placeholder="${ib.placeholder || 'Write your message...'}"
              style="color: ${ib.textColor || 'var(--cw-ink, #1e293b)'}"
              @input="${this.handleInput}"
              @keydown="${this.handleKeyDown}"
            />
          </div>

          <cw-button
            variant="icon"
            size="md"
            icon="SendFilled"
            .iconSize="${18}"
            .bg="${btnBg}"
            .color="${btnIconColor}"
            label="Send message"
            @click="${this.submit}"
          ></cw-button>
        </div>
      `;
    }

    // Joined layout (default)
    const btnColor = ib.buttonColor || this.accentColor || 'var(--cw-accent, #0b5fff)';
    let btnIconColor = ib.buttonIconColor || '#ffffff';
    if (btnIconColor.toLowerCase() === btnColor.toLowerCase()) {
      btnIconColor = '#ffffff';
    }

    return html`
      <div
        class="input-container"
        style="background-color: ${ib.backgroundColor || '#ffffff'}; border-radius: ${borderRadiusCss}; box-shadow: ${ib.boxShadow || '0 6px 16px rgba(0,0,0,0.12)'}; padding: 4px 4px 4px 16px; ${phaseStyle}"
      >
        <input
          type="text"
          aria-label="Message"
          .value="${this.draft}"
          placeholder="${ib.placeholder || 'Write your message...'}"
          style="color: ${ib.textColor || 'var(--cw-ink, #1e293b)'}"
          @input="${this.handleInput}"
          @keydown="${this.handleKeyDown}"
        />

        <cw-button
          variant="icon"
          size="md"
          icon="SendFilled"
          .iconSize="${18}"
          .bg="${btnColor}"
          .color="${btnIconColor}"
          label="Send message"
          @click="${this.submit}"
        ></cw-button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cw-greet-input': CwGreetInput;
  }
}
