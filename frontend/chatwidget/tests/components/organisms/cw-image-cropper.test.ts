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

describe('CwImageCropper pills, shapes and frame', () => {
  const drawImage = vi.fn();
  beforeEach(() => {
    drawImage.mockClear();
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      drawImage,
      beginPath: vi.fn(),
      arc: vi.fn(),
      clip: vi.fn()
    }) as any;
    HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,x');
  });

  const mount = async (props: Partial<CwImageCropper> & Record<string, unknown> = {}) => {
    document.body.innerHTML = '';
    const el = new CwImageCropper();
    el.open = true;
    Object.assign(el, props);
    document.body.appendChild(el);
    await el.updateComplete;
    return el;
  };
  const buttons = (el: CwImageCropper) => Array.from(el.shadowRoot!.querySelectorAll('cw-button')) as any[];
  const pill = (el: CwImageCropper, label: string) => buttons(el).find((b) => b.label === label || b.label?.endsWith(label))!;
  const overlay = (el: CwImageCropper) => el.shadowRoot!.querySelector('.crop-guide-overlay')!.getAttribute('style')!;

  it('renders nothing while closed', async () => {
    expect((await mount({ open: false })).shadowRoot!.querySelector('.modal-backdrop')).toBeNull();
  });

  it('sizes the crop window for each aspect ratio', async () => {
    expect(overlay(await mount())).toContain('width: 200px; height: 200px');
    expect(overlay(await mount({ aspectRatio: '4:3' }))).toContain('width: 200px; height: 150px');
    expect(overlay(await mount({ aspectRatio: '16:9' }))).toContain('width: 320px; height: 200px');
  });

  it('rounds the crop window by shape, with square corners for anything else', async () => {
    expect(overlay(await mount({ cropShape: 'circle' }))).toContain('border-radius: 50%');
    expect(overlay(await mount({ cropShape: 'rounded' }))).toContain('border-radius: 24px');
    expect(overlay(await mount({ cropShape: 'square' }))).toContain('border-radius: 8px');
    expect(overlay(await mount({ cropShape: 'constructor' as never }))).toContain('border-radius: 8px');
  });

  it('highlights the active shape and aspect pills with the primary colour', async () => {
    const el = await mount({ cropShape: 'rounded', aspectRatio: '4:3', primaryColor: 'crimson' });
    const active = (label: string) => [pill(el, label).variant, pill(el, label).bg];
    expect(active('Rounded')).toEqual(['primary', 'crimson']);
    expect(active('Circle')).toEqual(['outline', '']);
    expect(active('Square')).toEqual(['outline', '']);
    expect(active('4:3')).toEqual(['primary', 'crimson']);
    expect(active('1:1')).toEqual(['outline', '']);
    expect(active('16:9')).toEqual(['outline', '']);
  });

  it('switches shape on click, and a circle also resets the aspect to 1:1', async () => {
    const el = await mount({ aspectRatio: '16:9' });
    pill(el, 'Rounded').click();
    await el.updateComplete;
    expect([(el as any).cropShape, (el as any).aspectRatio]).toEqual(['rounded', '16:9']);
    pill(el, 'Square').click();
    await el.updateComplete;
    expect([(el as any).cropShape, (el as any).aspectRatio]).toEqual(['square', '16:9']);
    pill(el, 'Circle').click();
    await el.updateComplete;
    expect([(el as any).cropShape, (el as any).aspectRatio]).toEqual(['circle', '1:1']);
    expect(overlay(el)).toContain('width: 200px; height: 200px');
  });

  it('switches the aspect ratio on click and can hide the aspect pills', async () => {
    const el = await mount();
    pill(el, '16:9').click();
    await el.updateComplete;
    expect((el as any).aspectRatio).toBe('16:9');
    expect(overlay(el)).toContain('width: 320px');
    pill(el, '4:3').click();
    await el.updateComplete;
    expect(overlay(el)).toContain('height: 150px');
    expect(el.shadowRoot!.textContent).toContain('Aspect:');
    expect((await mount({ showAspectPills: false })).shadowRoot!.textContent).not.toContain('Aspect:');
  });

  it('shows the rotate button only when asked, and rotates in quarter turns', async () => {
    expect(buttons(await mount({ showRotate: false })).some((b) => b.label === 'Rotate 90°')).toBe(false);
    const el = await mount();
    const rotate = pill(el, 'Rotate 90°');
    rotate.click();
    rotate.click();
    expect((el as any).rotation).toBe(180);
    for (let i = 0; i < 2; i++) rotate.click();
    expect((el as any).rotation).toBe(0);
  });

  it('crops exactly the frame shown, scaled to the export size', async () => {
    const crop = async (aspectRatio: string, exportSize?: number) => {
      drawImage.mockClear();
      const el = await mount({ aspectRatio, ...(exportSize === undefined ? {} : { exportSize }) } as never);
      (el as any).imageObj = {};
      const events: any[] = [];
      el.addEventListener('cw:image-cropped', (e) => events.push((e as CustomEvent).detail));
      pill(el, 'Crop & Apply').click();
      return { call: drawImage.mock.calls.at(-1)!, events };
    };
    const square = await crop('1:1');
    expect(square.call.slice(1)).toEqual([100, 45, 200, 200, 0, 0, 250, 250]);
    expect(square.events[0]).toMatchObject({ exportSize: 250, cropShape: 'square' });
    expect((await crop('4:3')).call.slice(1)).toEqual([100, 70, 200, 150, 0, 0, 250, 188]);
    expect((await crop('16:9')).call.slice(1)).toEqual([40, 45, 320, 200, 0, 0, 250, 156]);
    // An export size of 0 falls back to the default.
    expect((await crop('1:1', 0)).call.slice(1)).toEqual([100, 45, 200, 200, 0, 0, 250, 250]);
    expect((await crop('1:1', 400)).events[0].exportSize).toBe(400);
  });
});
