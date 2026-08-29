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
