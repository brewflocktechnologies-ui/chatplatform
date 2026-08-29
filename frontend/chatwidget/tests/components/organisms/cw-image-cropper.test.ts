import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../../../components/organisms/cw-image-cropper.js';
import { CwImageCropper } from '../../../components/organisms/cw-image-cropper.js';

describe('CwImageCropper Organism Component', () => {
  let element: CwImageCropper;

  beforeEach(async () => {
    // Mock CanvasRenderingContext2D for happy-dom
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      clip: vi.fn(),
    }) as any;
    HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,mockedcroppeddata');

    document.body.innerHTML = '';
    element = new CwImageCropper();
    document.body.appendChild(element);
    await element.updateComplete;
  });

  it('should instantiate and mount cw-image-cropper element', () => {
    expect(element).toBeDefined();
    expect(element.tagName.toLowerCase()).toBe('cw-image-cropper');
  });

  it('should render modal dialog when open is true', async () => {
    element.open = true;
    element.titleText = 'Crop Image Test';
    await element.updateComplete;

    const modal = element.shadowRoot?.querySelector('.modal-backdrop');
    expect(modal).not.toBeNull();

    const title = element.shadowRoot?.querySelector('h3');
    expect(title?.textContent?.trim()).toContain('Crop Image Test');
  });

  it('should dispatch cw:close on cancel button click', async () => {
    element.open = true;
    const spy = vi.fn();
    element.addEventListener('cw:close', spy);
    await element.updateComplete;

    const cancelBtn = element.shadowRoot?.querySelector('cw-button[variant="secondary"]') as HTMLElement;
    cancelBtn?.click();

    expect(spy).toHaveBeenCalled();
  });

  it('handles image loading, dragging, zoom, rotation, shape/aspect selection, and cropping', async () => {
    const cropSpy = vi.fn();
    element.addEventListener('cw:image-cropped', cropSpy);

    element.open = true;
    element.imageSrc = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    await element.updateComplete;

    // Simulate canvas mousedown / mousemove / mouseup
    const canvasContainer = element.shadowRoot?.querySelector('.canvas-container') as HTMLElement;
    canvasContainer.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, clientY: 10 }));
    canvasContainer.dispatchEvent(new MouseEvent('mousemove', { clientX: 20, clientY: 20 }));
    canvasContainer.dispatchEvent(new MouseEvent('mouseup'));

    // Zoom slider change
    const zoomInput = element.shadowRoot?.querySelector('.zoom-slider') as HTMLInputElement;
    if (zoomInput) {
      zoomInput.value = '1.5';
      zoomInput.dispatchEvent(new Event('input'));
    }

    // Rotate button click
    const rotateBtn = element.shadowRoot?.querySelector('cw-button[label="Rotate 90°"]') as HTMLElement;
    rotateBtn?.click();

    // Shape button clicks (Square, Rounded, Circle) with updateComplete
    const squareBtn = element.shadowRoot?.querySelector('cw-button[label="⬜ Square"]') as HTMLElement;
    squareBtn?.click();
    await element.updateComplete;

    const roundedBtn = element.shadowRoot?.querySelector('cw-button[label="▢ Rounded"]') as HTMLElement;
    roundedBtn?.click();
    await element.updateComplete;

    const circleBtn = element.shadowRoot?.querySelector('cw-button[label="⚪ Circle"]') as HTMLElement;
    circleBtn?.click();
    await element.updateComplete;

    // Aspect ratio button clicks with updateComplete
    const aspect169 = element.shadowRoot?.querySelector('cw-button[label="16:9"]') as HTMLElement;
    aspect169?.click();
    await element.updateComplete;

    const aspect43 = element.shadowRoot?.querySelector('cw-button[label="4:3"]') as HTMLElement;
    aspect43?.click();
    await element.updateComplete;

    const aspect11 = element.shadowRoot?.querySelector('cw-button[label="1:1"]') as HTMLElement;
    aspect11?.click();
    await element.updateComplete;

    // Directly trigger handleCrop method for reliable testing (circle)
    (element as any).imageObj = new Image();
    (element as any).cropShape = 'circle';
    (element as any).handleCrop();
    expect(cropSpy).toHaveBeenCalled();

    // handleCrop with square & rounded
    (element as any).cropShape = 'square';
    (element as any).aspectRatio = '4:3';
    (element as any).handleCrop();

    (element as any).cropShape = 'rounded';
    (element as any).aspectRatio = '16:9';
    (element as any).exportSize = 0; // exportSize fallback 250
    (element as any).handleCrop();
  });

  it('handles backdrop click, header close button, showRotate false, showAspectPills false, and fixed = false', async () => {
    const closeSpy = vi.fn();
    element.addEventListener('cw:close', closeSpy);

    element.open = true;
    element.fixed = false;
    element.showRotate = false;
    element.showAspectPills = false;
    element.cropShape = 'rounded';
    element.aspectRatio = '4:3';
    await element.updateComplete;

    const backdrop = element.shadowRoot?.querySelector('.modal-backdrop') as HTMLElement;
    expect(backdrop.style.position).toBe('absolute');

    // Backdrop click
    backdrop.click();
    expect(closeSpy).toHaveBeenCalled();

    // Mousemove when isDragging is false
    (element as any).handleMouseMove(new MouseEvent('mousemove'));

    // Image load when imageSrc changes and onload callback execution
    element.imageSrc = 'http://example.com/test.png';
    await element.updateComplete;
    if ((element as any).imageObj) {
      (element as any).imageObj.onload();
    }

    // Header close button click
    element.open = true;
    await element.updateComplete;
    const headerCloseBtn = element.shadowRoot?.querySelector('.header cw-button') as HTMLElement;
    headerCloseBtn?.click();
    expect(closeSpy).toHaveBeenCalledTimes(2);

    // Null canvas context & handleCrop / drawCanvas without canvas or imageObj
    (element as any).imageObj = null;
    (element as any).drawCanvas();
    (element as any).handleCrop();

    const canvas = element.shadowRoot?.querySelector('#crop-canvas') as HTMLCanvasElement;
    if (canvas) {
      const spyContext = vi.spyOn(canvas, 'getContext').mockReturnValue(null as any);
      (element as any).imageObj = new Image();
      (element as any).drawCanvas();
      (element as any).handleCrop();
      spyContext.mockRestore();
    }
  });
});
