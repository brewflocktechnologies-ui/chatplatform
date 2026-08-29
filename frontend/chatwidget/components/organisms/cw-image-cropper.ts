import { LitElement, html, css } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { CORE_STYLES } from '../../styles/core-styles.js';
import '../atoms/cw-icon.js';
import '../atoms/cw-button.js';

@customElement('cw-image-cropper')
export class CwImageCropper extends LitElement {
  @property({ type: Boolean }) open = false;
  @property({ type: String }) imageSrc = '';
  @property({ type: String }) titleText = 'Crop & Resize Image';
  @property({ type: String }) cropShape: 'circle' | 'square' | 'rounded' = 'square';
  @property({ type: String }) primaryColor = 'var(--cw-accent, #0b5fff)';
  @property({ type: String }) cancelText = 'Cancel';
  @property({ type: String }) applyText = 'Crop & Apply';
  @property({ type: Boolean }) showRotate = true;
  @property({ type: Boolean }) showAspectPills = true;
  @property({ type: Number }) exportSize = 250;
  /** When true (default) the modal is fixed to the viewport; set false to contain it inside a positioned parent (used by stories). */
  @property({ type: Boolean }) fixed = true;
  /** Backdrop dimming (0 = transparent so the card can be previewed on a light background). */
  @property({ type: Number }) backdropOpacity = 0.75;

  @state() private zoom = 1;
  @state() private rotation = 0;
  @state() private aspectRatio: '1:1' | '4:3' | '16:9' = '1:1';
  @state() private isDragging = false;
  @state() private dragStartX = 0;
  @state() private dragStartY = 0;
  @state() private offsetX = 0;
  @state() private offsetY = 0;

  @query('#crop-canvas') private canvasElement!: HTMLCanvasElement;

  private imageObj: HTMLImageElement | null = null;

  static styles = [
    CORE_STYLES,
    css`
      :host {
        display: block;
      }
      .modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: rgba(9, 13, 22, 0.75);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        box-sizing: border-box;
        animation: fadeIn 0.2s ease-out;
      }
      .cropper-card {
        background: #ffffff;
        border-radius: 24px;
        width: 100%;
        max-width: 450px;
        box-shadow: 0 24px 48px rgba(0, 0, 0, 0.3);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        animation: popUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 18px 22px;
        border-bottom: 1px solid #f1f5f9;
      }
      .header h3 {
        margin: 0;
        font-size: 17px;
        font-weight: 700;
        color: var(--cw-ink, #101828);
      }
      .close-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        color: var(--cw-muted, #667085);
        padding: 6px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s;
      }
      .close-btn:hover {
        background: #f1f5f9;
        color: var(--cw-ink, #101828);
      }
      .canvas-container {
        position: relative;
        width: 100%;
        height: 290px;
        background: #090d16;
        display: flex;
        align-items: center;
        justify-content: center;
        user-select: none;
        touch-action: none;
        overflow: hidden;
      }
      canvas {
        cursor: grab;
      }
      canvas:active {
        cursor: grabbing;
      }
      .crop-guide-overlay {
        position: absolute;
        pointer-events: none;
        border: 2.5px dashed rgba(255, 255, 255, 0.9);
        box-shadow: 0 0 0 9999px rgba(9, 13, 22, 0.55);
        box-sizing: border-box;
        transition: border-radius 0.2s, width 0.2s, height 0.2s;
      }
      .controls-bar {
        padding: 18px 22px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        background: #f8fafc;
      }
      .control-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .control-group {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: var(--cw-muted, #667085);
        font-weight: 600;
      }
      .zoom-slider {
        flex: 1;
        cursor: pointer;
      }
      .btn-pill-group {
        display: flex;
        gap: 6px;
      }
      .pill-btn {
        background: #ffffff;
        border: 1px solid var(--cw-border, #e9ecf1);
        padding: 5px 12px;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 600;
        color: var(--cw-muted, #667085);
        cursor: pointer;
        transition: all 0.15s;
      }
      .pill-btn:hover {
        border-color: var(--cw-muted, #667085);
      }
      .icon-action-btn {
        background: #ffffff;
        border: 1px solid var(--cw-border, #e9ecf1);
        width: 34px;
        height: 34px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: var(--cw-muted, #667085);
        transition: background 0.15s;
      }
      .icon-action-btn:hover {
        background: #f1f5f9;
      }
      .footer {
        padding: 16px 22px;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 12px;
        border-top: 1px solid var(--cw-border, #e9ecf1);
        background: #ffffff;
      }
      .btn-cancel {
        background: transparent;
        border: 1px solid var(--cw-border, #e9ecf1);
        padding: 9px 18px;
        border-radius: 9999px;
        font-size: 13px;
        font-weight: 600;
        color: var(--cw-muted, #667085);
        cursor: pointer;
      }
      .btn-cancel:hover {
        background: #f1f5f9;
      }
      .btn-crop {
        border: none;
        padding: 9px 22px;
        border-radius: 9999px;
        font-size: 13px;
        font-weight: 700;
        color: #ffffff;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: transform 0.15s, opacity 0.15s;
      }
      .btn-crop:hover {
        opacity: 0.92;
        transform: translateY(-1px);
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes popUp {
        from { opacity: 0; transform: scale(0.92); }
        to { opacity: 1; transform: scale(1); }
      }
    `
  ];

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('open') || changedProperties.has('imageSrc')) {
      if (this.open && this.imageSrc) {
        this.loadImage();
      }
    }
  }

  private loadImage() {
    this.imageObj = new Image();
    this.imageObj.crossOrigin = 'anonymous';
    this.imageObj.onload = () => {
      this.zoom = 1;
      this.rotation = 0;
      this.offsetX = 0;
      this.offsetY = 0;
      this.drawCanvas();
    };
    this.imageObj.src = this.imageSrc;
  }

  private drawCanvas() {
    if (!this.canvasElement || !this.imageObj) return;

    const canvas = this.canvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const containerWidth = 400;
    const containerHeight = 290;
    canvas.width = containerWidth;
    canvas.height = containerHeight;

    ctx.clearRect(0, 0, containerWidth, containerHeight);
    ctx.save();

    // Center translation
    ctx.translate(containerWidth / 2 + this.offsetX, containerHeight / 2 + this.offsetY);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.scale(this.zoom, this.zoom);

    // Draw image centered
    const imgW = this.imageObj.width;
    const imgH = this.imageObj.height;
    const scale = Math.min(containerWidth / imgW, containerHeight / imgH) * 0.8;
    const drawW = imgW * scale;
    const drawH = imgH * scale;

    ctx.drawImage(this.imageObj, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }

  private handleMouseDown(e: MouseEvent) {
    this.isDragging = true;
    this.dragStartX = e.clientX - this.offsetX;
    this.dragStartY = e.clientY - this.offsetY;
  }

  private handleMouseMove(e: MouseEvent) {
    if (!this.isDragging) return;
    this.offsetX = e.clientX - this.dragStartX;
    this.offsetY = e.clientY - this.dragStartY;
    this.drawCanvas();
  }

  private handleMouseUp() {
    this.isDragging = false;
  }

  private handleRotate() {
    this.rotation = (this.rotation + 90) % 360;
    this.drawCanvas();
  }

  private handleZoomChange(e: Event) {
    this.zoom = parseFloat((e.target as HTMLInputElement).value);
    this.drawCanvas();
  }

  private handleCrop() {
    if (!this.canvasElement || !this.imageObj) return;

    const exportCanvas = document.createElement('canvas');
    const cropW = this.aspectRatio === '16:9' ? 320 : 200;
    const cropH = this.aspectRatio === '4:3' ? 150 : 200;
    const size = this.exportSize || 250;

    exportCanvas.width = size;
    exportCanvas.height = Math.round(size * (cropH / cropW));
    const expCtx = exportCanvas.getContext('2d');

    if (expCtx) {
      if (this.cropShape === 'circle') {
        expCtx.beginPath();
        expCtx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        expCtx.clip();
      }

      expCtx.drawImage(
        this.canvasElement,
        (400 - cropW) / 2,
        (290 - cropH) / 2,
        cropW,
        cropH,
        0,
        0,
        exportCanvas.width,
        exportCanvas.height
      );

      const croppedDataUrl = exportCanvas.toDataURL('image/png');
      this.dispatchEvent(
        new CustomEvent('cw:image-cropped', {
          detail: { dataUrl: croppedDataUrl, cropShape: this.cropShape, exportSize: size },
          bubbles: true,
          composed: true,
        })
      );
    }
    this.closeModal();
  }

  private closeModal() {
    this.open = false;
    this.dispatchEvent(new CustomEvent('cw:close', { bubbles: true, composed: true }));
  }

  render() {
    if (!this.open) return html``;

    const borderRadiusStyle =
      this.cropShape === 'circle'
        ? '50%'
        : this.cropShape === 'rounded'
        ? '24px'
        : '8px';

    const overlayWidth = this.aspectRatio === '16:9' ? 320 : 200;
    const overlayHeight = this.aspectRatio === '4:3' ? 150 : 200;

    return html`
      <div class="modal-backdrop" style="position: ${this.fixed ? 'fixed' : 'absolute'}; background: rgba(9, 13, 22, ${this.backdropOpacity});" @click="${(e: Event) => { if (e.target === e.currentTarget) this.closeModal(); }}">
        <div class="cropper-card" role="dialog" aria-modal="true" aria-label="${this.titleText}">
          <div class="header">
            <h3>${this.titleText}</h3>
            <cw-button
              variant="icon"
              size="xs"
              icon="Close"
              .iconSize="${18}"
              label="Close modal"
              @click="${this.closeModal}"
            ></cw-button>
          </div>

          <div
            class="canvas-container"
            @mousedown="${this.handleMouseDown}"
            @mousemove="${this.handleMouseMove}"
            @mouseup="${this.handleMouseUp}"
            @mouseleave="${this.handleMouseUp}"
          >
            <canvas id="crop-canvas" role="img" aria-label="Image crop preview"></canvas>
            <div
              class="crop-guide-overlay"
              style="width: ${overlayWidth}px; height: ${overlayHeight}px; border-radius: ${borderRadiusStyle};"
            ></div>
          </div>

          <div class="controls-bar">
            <!-- Zoom & Rotate Row -->
            <div class="control-row">
              <div class="control-group" style="flex: 1">
                <label for="zoom-slider">Zoom:</label>
                <input
                  id="zoom-slider"
                  type="range"
                  class="zoom-slider"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  style="accent-color: ${this.primaryColor}"
                  .value="${String(this.zoom)}"
                  @input="${this.handleZoomChange}"
                />
              </div>

              ${this.showRotate
                ? html`
                    <cw-button
                      variant="icon"
                      size="xs"
                      icon="RotateCw"
                      .iconSize="${16}"
                      label="Rotate 90°"
                      @click="${this.handleRotate}"
                    ></cw-button>
                  `
                : ''
              }
            </div>

            <!-- Shape Selector Row -->
            <div class="control-row">
              <div class="control-group">
                <span>Shape:</span>
                <div class="btn-pill-group">
                  <cw-button
                    size="xs"
                    .variant="${this.cropShape === 'circle' ? 'primary' : 'outline'}"
                    .bg="${this.cropShape === 'circle' ? this.primaryColor : ''}"
                    label="⚪ Circle"
                    @click="${() => { this.cropShape = 'circle'; this.aspectRatio = '1:1'; this.drawCanvas(); }}"
                  ></cw-button>
                  <cw-button
                    size="xs"
                    .variant="${this.cropShape === 'square' ? 'primary' : 'outline'}"
                    .bg="${this.cropShape === 'square' ? this.primaryColor : ''}"
                    label="⬜ Square"
                    @click="${() => { this.cropShape = 'square'; this.drawCanvas(); }}"
                  ></cw-button>
                  <cw-button
                    size="xs"
                    .variant="${this.cropShape === 'rounded' ? 'primary' : 'outline'}"
                    .bg="${this.cropShape === 'rounded' ? this.primaryColor : ''}"
                    label="▢ Rounded"
                    @click="${() => { this.cropShape = 'rounded'; this.drawCanvas(); }}"
                  ></cw-button>
                </div>
              </div>
            </div>

            <!-- Resolution & Aspect Ratio Row -->
            ${this.showAspectPills
              ? html`
                  <div class="control-row">
                    <div class="control-group">
                      <span>Aspect:</span>
                      <div class="btn-pill-group">
                        <cw-button
                          size="xs"
                          .variant="${this.aspectRatio === '1:1' ? 'primary' : 'outline'}"
                          .bg="${this.aspectRatio === '1:1' ? this.primaryColor : ''}"
                          label="1:1"
                          @click="${() => { this.aspectRatio = '1:1'; this.drawCanvas(); }}"
                        ></cw-button>
                        <cw-button
                          size="xs"
                          .variant="${this.aspectRatio === '4:3' ? 'primary' : 'outline'}"
                          .bg="${this.aspectRatio === '4:3' ? this.primaryColor : ''}"
                          label="4:3"
                          @click="${() => { this.aspectRatio = '4:3'; this.drawCanvas(); }}"
                        ></cw-button>
                        <cw-button
                          size="xs"
                          .variant="${this.aspectRatio === '16:9' ? 'primary' : 'outline'}"
                          .bg="${this.aspectRatio === '16:9' ? this.primaryColor : ''}"
                          label="16:9"
                          @click="${() => { this.aspectRatio = '16:9'; this.drawCanvas(); }}"
                        ></cw-button>
                      </div>
                    </div>
                  </div>
                `
              : ''
            }
          </div>

          <div class="footer">
            <cw-button
              variant="secondary"
              size="sm"
              .label="${this.cancelText}"
              @click="${this.closeModal}"
            ></cw-button>
            <cw-button
              variant="primary"
              size="sm"
              .label="${this.applyText}"
              .bg="${this.primaryColor}"
              @click="${this.handleCrop}"
            ></cw-button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cw-image-cropper': CwImageCropper;
  }
}
