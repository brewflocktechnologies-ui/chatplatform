import { LitElement, html, css } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { CORE_STYLES } from '../../styles/core-styles.js';
import '../atoms/cw-icon.js';
import '../atoms/cw-button.js';

type CropShape = 'circle' | 'square' | 'rounded';
type AspectRatio = '1:1' | '4:3' | '16:9';

const SHAPES: ReadonlyArray<readonly [CropShape, string]> = [
  ['circle', '⚪ Circle'],
  ['square', '⬜ Square'],
  ['rounded', '▢ Rounded'],
];
const ASPECTS: readonly AspectRatio[] = ['1:1', '4:3', '16:9'];

// Anything that is not a circle or rounded renders as a plain square corner.
const SHAPE_RADIUS: ReadonlyMap<string, string> = new Map([
  ['circle', '50%'],
  ['rounded', '24px'],
]);

/** Size of the crop window on the 400x290 preview canvas, for each aspect ratio. */
function cropFrame(aspectRatio: string): { width: number; height: number } {
  return {
    width: aspectRatio === '16:9' ? 320 : 200,
    height: aspectRatio === '4:3' ? 150 : 200,
  };
}

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

  @query('#crop-canvas') private readonly canvasElement!: HTMLCanvasElement;

  private imageObj: HTMLImageElement | null = null;

  static readonly styles = [
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
    this.zoom = Number.parseFloat((e.target as HTMLInputElement).value);
    this.drawCanvas();
  }

  private handleCrop() {
    if (!this.canvasElement || !this.imageObj) return;

    const exportCanvas = document.createElement('canvas');
    const { width: cropW, height: cropH } = cropFrame(this.aspectRatio);
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

  private selectShape(shape: CropShape, resetAspect = false) {
    this.cropShape = shape;
    if (resetAspect) this.aspectRatio = '1:1';
    this.drawCanvas();
  }

  private selectAspect(ratio: AspectRatio) {
    this.aspectRatio = ratio;
    this.drawCanvas();
  }

  private renderPill(label: string, active: boolean, onSelect: () => void) {
    return html`
      <cw-button
        size="xs"
        .variant="${active ? 'primary' : 'outline'}"
        .bg="${active ? this.primaryColor : ''}"
        label="${label}"
        @click="${onSelect}"
      ></cw-button>
    `;
  }

  private renderAspectRow() {
    return html`
      <div class="control-row">
        <div class="control-group">
          <span>Aspect:</span>
          <div class="btn-pill-group">
            ${ASPECTS.map((ratio) => this.renderPill(ratio, this.aspectRatio === ratio, () => this.selectAspect(ratio)))}
          </div>
        </div>
      </div>
    `;
  }

  render() {
    if (!this.open) return html``;

    const borderRadiusStyle = SHAPE_RADIUS.get(this.cropShape) ?? '8px';
    const { width: overlayWidth, height: overlayHeight } = cropFrame(this.aspectRatio);

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
                  ${SHAPES.map(([shape, label]) =>
                    this.renderPill(label, this.cropShape === shape, () => this.selectShape(shape, shape === 'circle'))
                  )}
                </div>
              </div>
            </div>

            <!-- Resolution & Aspect Ratio Row -->
            ${this.showAspectPills ? this.renderAspectRow() : ''}
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
