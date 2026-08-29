import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CORE_STYLES } from '../../styles/core-styles.js';
import type { FormField } from '../../config/form-schemas.js';

@customElement('cw-form-field')
export class CwFormField extends LitElement {
  @property({ type: Object }) field!: FormField;
  @property({ type: String }) value = '';
  @property({ type: String }) error = '';
  @property({ type: Boolean }) disabled = false;

  static styles = [
    CORE_STYLES,
    css`
      :host {
        display: block;
        width: 100%;
        margin-bottom: 22px;
        box-sizing: border-box;
      }
      :host(:last-child) {
        margin-bottom: 0;
      }
      .field-container {
        display: flex;
        flex-direction: column;
        width: 100%;
      }
      label {
        font-size: 11.5px;
        font-weight: 600;
        color: var(--cw-muted, #64748b);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        display: flex;
        align-items: center;
        gap: 4px;
        user-select: none;
        margin-bottom: 8px;
      }
      .req-asterisk {
        color: var(--cw-error, #f43f5e);
        font-weight: 700;
      }
      .input-ctrl {
        width: 100%;
        box-sizing: border-box;
        height: 44px;
        padding: 0 14px;
        border: 1.5px solid var(--cw-border, #e2e8f0);
        border-radius: 12px;
        font-family: inherit;
        font-size: 14px;
        font-weight: 400;
        background: var(--cw-surface, #ffffff);
        color: var(--cw-ink, #0f172a);
        transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
        outline: none;
      }
      .input-ctrl::placeholder {
        color: var(--cw-muted, #94a3b8);
        opacity: 0.8;
      }
      .input-ctrl:hover:not(:disabled):not(:focus) {
        border-color: color-mix(in srgb, var(--cw-accent, #0b5fff) 35%, var(--cw-border, #cbd5e1));
      }
      .input-ctrl:focus {
        border-color: var(--cw-accent, #0b5fff);
        box-shadow: 0 0 0 4px color-mix(in srgb, var(--cw-accent, #0b5fff) 14%, transparent);
        background: var(--cw-surface, #ffffff);
      }
      .input-ctrl:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        background: var(--cw-bg, #f8fafc);
      }
      .input-ctrl.has-error {
        border-color: var(--cw-error, #f43f5e);
        background-color: color-mix(in srgb, var(--cw-error, #f43f5e) 3%, var(--cw-surface, #ffffff));
      }
      .input-ctrl.has-error:focus {
        box-shadow: 0 0 0 4px color-mix(in srgb, var(--cw-error, #f43f5e) 15%, transparent);
      }
      textarea.input-ctrl {
        height: auto;
        min-height: 92px;
        padding: 12px 14px;
        line-height: 1.5;
        resize: vertical;
      }
      select.input-ctrl {
        cursor: pointer;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 14px center;
        padding-right: 38px;
      }
      .error-msg {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 12px;
        color: var(--cw-error, #f43f5e);
        font-weight: 500;
        margin-top: 3px;
        animation: fadeInSlide 0.2s ease-out;
      }
      .error-msg svg {
        flex-shrink: 0;
      }
      @keyframes fadeInSlide {
        from { opacity: 0; transform: translateY(-3px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `
  ];

  private handleInput(e: Event) {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    this.value = target.value;
    this.dispatchEvent(
      new CustomEvent('cw:field-change', {
        detail: { name: this.field?.name, value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    if (!this.field) return html``;

    const f = this.field;
    const isError = !!this.error;
    const ctrlClass = `input-ctrl ${isError ? 'has-error' : ''}`;

    return html`
      <div class="field-container">
        ${f.label
          ? html`
              <label for="${f.name}">
                <span>${f.label}</span>
                ${f.required ? html`<span class="req-asterisk">*</span>` : ''}
              </label>
            `
          : ''
        }

        ${f.type === 'textarea'
          ? html`
              <textarea
                id="${f.name}"
                name="${f.name}"
                class="${ctrlClass}"
                rows="${f.rows || 3}"
                placeholder="${f.placeholder || ''}"
                .value="${this.value}"
                ?disabled="${this.disabled}"
                @input="${this.handleInput}"
              ></textarea>
            `
          : f.type === 'select'
          ? html`
              <select
                id="${f.name}"
                name="${f.name}"
                class="${ctrlClass}"
                .value="${this.value}"
                ?disabled="${this.disabled}"
                @change="${this.handleInput}"
              >
                ${f.placeholder ? html`<option value="" disabled ?selected="${!this.value}">${f.placeholder}</option>` : ''}
                ${(f.options || []).map(
                  (opt) => html`
                    <option value="${opt.value}" ?selected="${this.value === opt.value}">
                      ${opt.label}
                    </option>
                  `
                )}
              </select>
            `
          : html`
              <input
                id="${f.name}"
                name="${f.name}"
                type="${f.type || 'text'}"
                class="${ctrlClass}"
                placeholder="${f.placeholder || ''}"
                .value="${this.value}"
                ?disabled="${this.disabled}"
                @input="${this.handleInput}"
              />
            `
        }

        ${isError
          ? html`
              <span class="error-msg">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>${this.error}</span>
              </span>
            `
          : ''
        }
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cw-form-field': CwFormField;
  }
}
