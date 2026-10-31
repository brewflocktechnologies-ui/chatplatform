import { describe, it, expect, beforeEach } from 'vitest';
import '../../../components/atoms/cw-tooltip.js';
import { CwTooltip } from '../../../components/atoms/cw-tooltip.js';

describe('CwTooltip Atom Component', () => {
  let element: CwTooltip;

  beforeEach(async () => {
    document.body.innerHTML = '';
    element = new CwTooltip();
    document.body.appendChild(element);
    await element.updateComplete;
  });

  it('should instantiate and mount cw-tooltip element', () => {
    expect(element).toBeDefined();
    expect(element.tagName.toLowerCase()).toBe('cw-tooltip');
  });

  it('should render tooltip text and arrow for positions left, right, top, bottom with border', async () => {
    element.text = 'Need help?';
    element.visible = true;
    element.borderWidth = 1;
    element.borderColor = '#000000';

    const positions = ['left', 'right', 'top', 'bottom'] as const;
    for (const pos of positions) {
      element.position = pos;
      await element.updateComplete;

      const box = element.shadowRoot?.querySelector('.tooltip-box');
      expect(box).not.toBeNull();
      expect(box?.textContent?.trim()).toContain('Need help?');

      const arrow = element.shadowRoot?.querySelector('.tooltip-arrow');
      expect(arrow).not.toBeNull();
    }
  });

  it('handles arrowEnabled false, zero border width, and position/borderColor fallbacks', async () => {
    element.text = 'Tip';
    element.visible = true;
    element.borderWidth = 0;
    element.arrowEnabled = true;

    const positions = ['left', 'right', 'top', 'bottom'] as const;
    for (const pos of positions) {
      element.position = pos;
      await element.updateComplete;
      const arrow = element.shadowRoot?.querySelector('.tooltip-arrow');
      expect(arrow).not.toBeNull();
    }

    element.arrowEnabled = false;
    element.position = undefined as any;
    element.borderColor = undefined as any;
    await element.updateComplete;

    const box = element.shadowRoot?.querySelector('.tooltip-box');
    expect(box).not.toBeNull();

    const arrow = element.shadowRoot?.querySelector('.tooltip-arrow');
    expect(arrow).toBeNull();
  });

  it('should hide tooltip when visible is false or text is empty', async () => {
    element.visible = false;
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.tooltip-box')).toBeNull();

    element.visible = true;
    element.text = '';
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.tooltip-box')).toBeNull();
  });
});

describe('CwTooltip resolved styles', () => {
  const mount = async (props: Partial<CwTooltip>): Promise<CwTooltip> => {
    document.body.innerHTML = '';
    const el = new CwTooltip();
    Object.assign(el, props);
    document.body.appendChild(el);
    await el.updateComplete;
    return el;
  };
  const box = (el: CwTooltip) => el.shadowRoot!.querySelector('.tooltip-box') as HTMLElement | null;
  const arrow = (el: CwTooltip) => el.shadowRoot!.querySelector('.tooltip-arrow') as HTMLElement | null;

  it('renders nothing when hidden or without text', async () => {
    expect(box(await mount({ visible: false }))).toBeNull();
    expect(box(await mount({ text: '' }))).toBeNull();
  });

  it('turns a numeric padding into pixels and falls back for an empty one', async () => {
    expect(box(await mount({ padding: 5 as never }))!.getAttribute('style')).toContain('padding: 5px');
    expect(box(await mount({ padding: '1px 2px' }))!.getAttribute('style')).toContain('padding: 1px 2px');
    expect(box(await mount({ padding: '' }))!.getAttribute('style')).toContain('padding: 8px 16px');
  });

  it('turns a bare colour into a soft shadow and keeps full shadows and none', async () => {
    expect(box(await mount({ boxShadow: 'red' }))!.getAttribute('style')).toContain('box-shadow: 0 4px 12px red');
    expect(box(await mount({ boxShadow: '0 1px 2px blue' }))!.getAttribute('style')).toContain('box-shadow: 0 1px 2px blue');
    expect(box(await mount({ boxShadow: 'none' }))!.getAttribute('style')).toContain('box-shadow: none');
    expect(box(await mount({ boxShadow: '' }))!.getAttribute('style')).toContain('box-shadow: 0 4px 12px rgba(0,0,0,0.1)');
  });

  it('positions the arrow on the side facing the target', async () => {
    expect(arrow(await mount({ position: 'left' }))!.getAttribute('style')).toContain('right: -4px; top: 50%');
    expect(arrow(await mount({ position: 'right' }))!.getAttribute('style')).toContain('left: -4px; top: 50%');
    expect(arrow(await mount({ position: 'top' }))!.getAttribute('style')).toContain('bottom: -4px; left: 50%');
    expect(arrow(await mount({ position: 'bottom' }))!.getAttribute('style')).toContain('top: -4px; left: 50%');
    // An unknown side behaves like "bottom", and so does an inherited object key.
    expect(arrow(await mount({ position: 'diagonal' as never }))!.getAttribute('style')).toContain('top: -4px; left: 50%');
    expect(arrow(await mount({ position: 'constructor' as never }))!.getAttribute('style')).toContain('top: -4px; left: 50%');
  });

  it('draws the border only on the two edges that face the box, and only when there is a border', async () => {
    const edges: Record<string, [string, string]> = {
      left: ['top', 'right'],
      right: ['bottom', 'left'],
      top: ['bottom', 'right'],
      bottom: ['top', 'left']
    };
    for (const [position, [a, b]] of Object.entries(edges)) {
      const style = arrow(await mount({ position: position as never, borderWidth: 2, borderColor: 'red' }))!.getAttribute('style')!;
      expect(style).toContain(`border-${a}: 2px solid red; border-${b}: 2px solid red;`);
      expect(arrow(await mount({ position: position as never, borderWidth: 0 }))!.getAttribute('style')).not.toContain('border-');
    }
    // A negative width is treated as no border.
    expect(arrow(await mount({ borderWidth: -3 }))!.getAttribute('style')).not.toContain('border-');
  });

  it('omits the arrow when it is turned off', async () => {
    expect(arrow(await mount({ arrowEnabled: false }))).toBeNull();
    expect(arrow(await mount({ arrowEnabled: true }))).not.toBeNull();
  });
});
