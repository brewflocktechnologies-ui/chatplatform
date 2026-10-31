import { describe, it, expect, beforeEach } from 'vitest';
import '../../../components/atoms/cw-button.js';
import { CwButton } from '../../../components/atoms/cw-button.js';

describe('CwButton Atom Component', () => {
  let element: CwButton;

  beforeEach(async () => {
    document.body.innerHTML = '';
    element = new CwButton();
    document.body.appendChild(element);
    await element.updateComplete;
  });

  it('should instantiate and mount cw-button element', () => {
    expect(element).toBeDefined();
    expect(element.tagName.toLowerCase()).toBe('cw-button');
  });

  it('should render label text and handle variant / size classes', async () => {
    element.label = 'Send Message';
    element.variant = 'primary';
    element.size = 'lg';
    await element.updateComplete;

    const btn = element.shadowRoot?.querySelector('button');
    expect(btn).not.toBeNull();
    expect(btn?.classList.contains('variant-primary')).toBe(true);
    expect(btn?.classList.contains('size-lg')).toBe(true);
    expect(btn?.textContent?.trim()).toContain('Send Message');
  });

  it('should support disabled state', async () => {
    element.disabled = true;
    await element.updateComplete;

    const btn = element.shadowRoot?.querySelector('button');
    expect(btn?.hasAttribute('disabled')).toBe(true);
  });

  it('should render icon when icon property is set and right icon position', async () => {
    element.icon = 'Send';
    element.label = 'Submit';
    element.iconPosition = 'right';
    element.ariaLabel = 'Submit Form';
    element.variant = 'danger';
    element.size = 'xs';
    element.width = 120;
    element.height = 36;
    element.padding = '8px';
    await element.updateComplete;

    const icon = element.shadowRoot?.querySelector('cw-icon');
    expect(icon).not.toBeNull();

    const btn = element.shadowRoot?.querySelector('button');
    expect(btn?.getAttribute('aria-label')).toBe('Submit Form');
  });

  it('renders all variants and size combinations', async () => {
    const variants: CwButton['variant'][] = ['secondary', 'ghost', 'outline', 'icon'];
    const sizes: CwButton['size'][] = ['xs', 'sm', 'md', 'lg'];

    for (const v of variants) {
      for (const s of sizes) {
        element.variant = v;
        element.size = s;
        element.icon = 'Send';
        element.label = '';
        await element.updateComplete;
        const btn = element.shadowRoot?.querySelector('button');
        expect(btn).not.toBeNull();
      }
    }
  });

  it('supports numeric and string borderRadius, styling options, and fallback ariaLabel', async () => {
    element.variant = 'icon';
    element.borderRadius = 12 as any;
    element.bg = '#000000';
    element.color = '#ffffff';
    element.borderColor = '#ff0000';
    element.fullWidth = true;
    element.elevatable = true;
    element.scalable = true;
    element.label = '';
    element.icon = '';
    element.ariaLabel = null;
    await element.updateComplete;

    let btn = element.shadowRoot?.querySelector('button') as HTMLElement;
    expect(btn.getAttribute('style')).toContain('border-radius: 12px');
    expect(btn.getAttribute('aria-label')).toBe('button');
    expect(btn.classList.contains('elevatable')).toBe(true);
    expect(btn.classList.contains('scalable')).toBe(true);

    // String borderRadius, empty borderRadius, and padding height auto branch
    element.borderRadius = '20px';
    element.padding = '8px 16px';
    element.height = undefined;
    await element.updateComplete;

    btn = element.shadowRoot?.querySelector('button') as HTMLElement;
    expect(btn.getAttribute('style')).toContain('border-radius: 20px');
    expect(btn.getAttribute('style')).toContain('height: auto');

    element.borderRadius = '';
    await element.updateComplete;
    btn = element.shadowRoot?.querySelector('button') as HTMLElement;
    expect(btn.getAttribute('style')).not.toContain('border-radius');
  });
});

describe('CwButton resolved output', () => {
  const mount = async (props: Partial<CwButton>): Promise<CwButton> => {
    document.body.innerHTML = '';
    const el = new CwButton();
    Object.assign(el, props);
    document.body.appendChild(el);
    await el.updateComplete;
    return el;
  };
  const btn = (el: CwButton) => el.shadowRoot!.querySelector('button')!;
  const iconSize = (el: CwButton) => (el.shadowRoot!.querySelector('cw-icon') as any)?.size;

  it('sizes the icon from the button size, and lets an explicit size win', async () => {
    expect(iconSize(await mount({ icon: 'x', size: 'xs' }))).toBe(12);
    expect(iconSize(await mount({ icon: 'x', size: 'sm' }))).toBe(14);
    expect(iconSize(await mount({ icon: 'x', size: 'md' }))).toBe(16);
    expect(iconSize(await mount({ icon: 'x', size: 'lg' }))).toBe(20);
    expect(iconSize(await mount({ icon: 'x', size: 'lg', iconSize: 30 }))).toBe(30);
    // 0 means "not set".
    expect(iconSize(await mount({ icon: 'x', size: 'lg', iconSize: 0 }))).toBe(20);
    // An unknown size (or an inherited object key) uses the default.
    expect(iconSize(await mount({ icon: 'x', size: 'huge' as never }))).toBe(16);
    expect(iconSize(await mount({ icon: 'x', size: 'constructor' as never }))).toBe(16);
  });

  it('picks the accessible name: explicit, then label, then the icon name, then none', async () => {
    expect(btn(await mount({ ariaLabel: 'Explicit', label: 'Visible', icon: 'x' })).getAttribute('aria-label')).toBe('Explicit');
    expect(btn(await mount({ label: 'Visible', icon: 'x' })).getAttribute('aria-label')).toBe('Visible');
    expect(btn(await mount({ icon: 'send' })).getAttribute('aria-label')).toBe('send');
    expect(btn(await mount({ variant: 'icon' })).getAttribute('aria-label')).toBe('button');
    expect(btn(await mount({})).hasAttribute('aria-label')).toBe(false);
  });

  it('shows the icon on the left, right, or alone', async () => {
    const left = await mount({ icon: 'x', label: 'Go', iconPosition: 'left' });
    expect(left.shadowRoot!.querySelectorAll('cw-icon')).toHaveLength(1);
    expect(left.shadowRoot!.querySelector('span')?.textContent).toBe('Go');

    const right = await mount({ icon: 'x', label: 'Go', iconPosition: 'right' });
    const inner = btn(right).innerHTML;
    expect(inner.indexOf('<span')).toBeLessThan(inner.indexOf('<cw-icon'));

    const only = await mount({ icon: 'x', label: 'Go', iconPosition: 'only' });
    expect(only.shadowRoot!.querySelectorAll('cw-icon')).toHaveLength(1);
    expect(only.shadowRoot!.querySelector('span')).toBeNull();

    expect((await mount({ label: 'Go' })).shadowRoot!.querySelector('cw-icon')).toBeNull();
  });

  it('turns the style props into an inline style', async () => {
    const style = btn(
      await mount({ bg: 'red', color: '#000', borderColor: 'blue', padding: '2px', borderRadius: '4px', width: 80, height: 30 })
    ).getAttribute('style');
    expect(style).toBe('background-color: red; color: #000; border-color: blue; padding: 2px; border-radius: 4px; width: 80px; height: 30px');
  });

  it('handles numeric radius, full width, zero sizes and the auto-height rule', async () => {
    expect(btn(await mount({ borderRadius: 12 as never })).getAttribute('style')).toContain('border-radius: 12px');
    expect(btn(await mount({ fullWidth: true })).getAttribute('style')).toContain('width: 100%');
    // An explicit width beats full width; zero is a real value.
    expect(btn(await mount({ fullWidth: true, width: 0 })).getAttribute('style')).toContain('width: 0px');
    expect(btn(await mount({ height: 0 })).getAttribute('style')).toContain('height: 0px');
    // Padding without an explicit height lets the height follow the content.
    expect(btn(await mount({ padding: '1px' })).getAttribute('style')).toContain('height: auto');
    expect(btn(await mount({ padding: '1px', height: 20 })).getAttribute('style')).toContain('height: 20px');
    expect(btn(await mount({ borderRadius: '' })).getAttribute('style')).not.toContain('border-radius');
  });
});
