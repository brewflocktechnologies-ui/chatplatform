import { describe, it, expect, beforeEach } from 'vitest';
import '../../../components/atoms/cw-badge.js';
import { CwBadge } from '../../../components/atoms/cw-badge.js';

describe('CwBadge Atom Component', () => {
  let element: CwBadge;

  beforeEach(async () => {
    document.body.innerHTML = '';
    element = new CwBadge();
    document.body.appendChild(element);
    await element.updateComplete;
  });

  it('should instantiate and mount cw-badge element', () => {
    expect(element).toBeDefined();
    expect(element.tagName.toLowerCase()).toBe('cw-badge');
  });

  it('should render empty when count is 0 or negative', async () => {
    element.count = 0;
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.badge')).toBeNull();

    element.count = -2;
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.badge')).toBeNull();
  });

  it('should render count badge when count > 0', async () => {
    element.count = 5;
    await element.updateComplete;
    const badge = element.shadowRoot?.querySelector('.badge');
    expect(badge).not.toBeNull();
    expect(badge?.textContent?.trim()).toBe('5');
  });

  it('should apply badge positioning for top-left, bottom-right, bottom-left, relative', async () => {
    element.count = 3;
    element.position = 'top-left';
    element.animation = 'bounce';
    element.borderRadius = 8;
    await element.updateComplete;

    let badge = element.shadowRoot?.querySelector('.badge') as HTMLElement;
    expect(badge.getAttribute('style')).toContain('top: -6px');

    element.position = 'bottom-right';
    element.animation = 'wiggle';
    await element.updateComplete;
    badge = element.shadowRoot?.querySelector('.badge') as HTMLElement;
    expect(badge.getAttribute('style')).toContain('bottom: -6px');

    element.position = 'bottom-left';
    element.animation = 'pulse';
    await element.updateComplete;
    badge = element.shadowRoot?.querySelector('.badge') as HTMLElement;
    expect(badge.getAttribute('style')).toContain('bottom: -6px');

    element.position = 'relative';
    await element.updateComplete;
    badge = element.shadowRoot?.querySelector('.badge') as HTMLElement;
    expect(badge.getAttribute('style')).toContain('position: relative');
  });

  it('handles animation replacement strings for custom-pulse, my-bounce, super-wiggle', async () => {
    element.count = 2;
    element.animation = 'custom-pulse 2s';
    await element.updateComplete;
    let badge = element.shadowRoot?.querySelector('.badge') as HTMLElement;
    expect(badge.getAttribute('style')).toContain('badgePulse');

    element.animation = 'my-bounce 1s';
    await element.updateComplete;
    badge = element.shadowRoot?.querySelector('.badge') as HTMLElement;
    expect(badge.getAttribute('style')).toContain('badgeBounce');

    element.animation = 'super-wiggle 3s';
    await element.updateComplete;
    badge = element.shadowRoot?.querySelector('.badge') as HTMLElement;
    expect(badge.getAttribute('style')).toContain('badgeWiggle');
  });

  it('should fallback to config properties when available', async () => {
    element.count = 1;
    element.config = {
      position: 'top-left',
      offsetX: -4,
      offsetY: -4,
      size: 18,
      animation: 'wiggle',
      backgroundColor: '#ff0000',
      textColor: '#ffffff',
      fontSize: 10,
      borderWidth: 1,
      borderColor: '#000000',
      borderRadius: 12,
      fontWeight: '600',
      boxShadow: 'none',
      padding: '2px 6px',
    };
    await element.updateComplete;

    let badge = element.shadowRoot?.querySelector('.badge') as HTMLElement;
    expect(badge.getAttribute('style')).toContain('border-radius: 12px');
    expect(badge.getAttribute('style')).toContain('background-color: #ff0000');

    // Config string borderRadius
    element.config = { ...element.config, borderRadius: '50%' };
    await element.updateComplete;
    badge = element.shadowRoot?.querySelector('.badge') as HTMLElement;
    expect(badge.getAttribute('style')).toContain('border-radius: 50%');
  });

  it('supports string borderRadius, static position, and explicit element property overrides over config', async () => {
    element.count = 4;
    element.position = 'static';
    element.offsetX = 12;
    element.offsetY = 14;
    element.borderRadius = '8px';
    element.borderWidth = 3;
    element.padding = '4px';
    element.config = {
      offsetX: -10,
      offsetY: -10,
    };
    await element.updateComplete;

    const badge = element.shadowRoot?.querySelector('.badge') as HTMLElement;
    expect(badge.getAttribute('style')).toContain('position: static');
    expect(badge.getAttribute('style')).toContain('border-radius: 8px');
    expect(badge.getAttribute('style')).toContain('padding: 4px');
  });
});

describe('CwBadge style resolution', () => {
  const styleOf = async (props: Partial<CwBadge>): Promise<string> => {
    document.body.innerHTML = '';
    const el = new CwBadge();
    document.body.appendChild(el);
    el.count = 4;
    Object.assign(el, props);
    await el.updateComplete;
    return (el.shadowRoot?.querySelector('.badge') as HTMLElement).getAttribute('style') ?? '';
  };

  it('uses the documented defaults when nothing is configured', async () => {
    const style = await styleOf({});
    expect(style).toContain('top: -6px');
    expect(style).toContain('right: -6px');
    expect(style).toContain('padding: 0 4px');
    expect(style).toContain('border-radius: 9999px');
    expect(style).toContain('border: 2px solid #ffffff');
    expect(style).toContain('box-shadow: 0 1px 3px rgba(0,0,0,0.15)');
    expect(style).toContain('animation: none');
  });

  it('prefers a property over the config object, and the config over the default', async () => {
    const config = { offsetX: 9, offsetY: 8, size: 30, borderWidth: 4, padding: 3, borderRadius: 7 };
    const fromConfig = await styleOf({ config });
    expect(fromConfig).toContain('right: 9px');
    expect(fromConfig).toContain('top: 8px');
    expect(fromConfig).toContain('height: 30px');
    expect(fromConfig).toContain('border: 4px solid');
    expect(fromConfig).toContain('padding: 3px');
    expect(fromConfig).toContain('border-radius: 7px');

    const fromProps = await styleOf({ config, offsetX: 1, offsetY: 2, borderWidth: 0, padding: '5px 6px', borderRadius: '50%' });
    expect(fromProps).toContain('right: 1px');
    expect(fromProps).toContain('top: 2px');
    expect(fromProps).toContain('border: 0px solid');
    expect(fromProps).toContain('padding: 5px 6px');
    expect(fromProps).toContain('border-radius: 50%');
  });

  it('keeps zero as a real value instead of falling back', async () => {
    const style = await styleOf({ offsetX: 0, offsetY: 0, borderWidth: 0, padding: 0, borderRadius: 0 });
    expect(style).toContain('top: 0px');
    expect(style).toContain('right: 0px');
    expect(style).toContain('border: 0px solid');
    expect(style).toContain('padding: 0px');
    expect(style).toContain('border-radius: 0px');
  });

  it('falls back to the defaults for null values instead of printing "null"', async () => {
    const style = await styleOf({
      offsetX: null as unknown as number,
      offsetY: null as unknown as number,
      borderWidth: null as unknown as number,
      padding: null as unknown as string,
      borderRadius: null as unknown as number
    });
    expect(style).not.toContain('null');
    expect(style).toContain('top: -6px');
    expect(style).toContain('padding: 0 4px');
    expect(style).toContain('border-radius: 9999px');
    expect(style).toContain('border: 2px solid');
  });

  it('places the badge in each corner and defaults unknown positions to top-right', async () => {
    expect(await styleOf({ position: 'top-left', offsetX: 1, offsetY: 2 })).toMatch(/top: 2px; left: 1px/);
    expect(await styleOf({ position: 'bottom-right', offsetX: 1, offsetY: 2 })).toMatch(/bottom: 2px; right: 1px/);
    expect(await styleOf({ position: 'bottom-left', offsetX: 1, offsetY: 2 })).toMatch(/bottom: 2px; left: 1px/);
    expect(await styleOf({ position: 'somewhere-else', offsetX: 1, offsetY: 2 })).toMatch(/top: 2px; right: 1px/);
    // The inherited property names must not be mistaken for a corner.
    expect(await styleOf({ position: 'constructor', offsetX: 1, offsetY: 2 })).toMatch(/top: 2px; right: 1px/);
  });

  it('does not offset a relatively or statically positioned badge', async () => {
    for (const position of ['relative', 'static']) {
      const style = await styleOf({ position, offsetX: 5, offsetY: 5 });
      expect(style).toContain(`position: ${position}`);
      expect(style).not.toMatch(/(^|; )(top|left|right|bottom):/);
    }
  });

  it('expands the short animation names and rewrites names inside custom strings', async () => {
    expect(await styleOf({ animation: 'pulse' })).toContain('animation: badgePulse 1.5s ease-in-out infinite');
    expect(await styleOf({ animation: 'bounce' })).toContain('animation: badgeBounce 1s infinite');
    expect(await styleOf({ animation: 'wiggle' })).toContain('animation: badgeWiggle 2.5s ease-in-out infinite');
    expect(await styleOf({ animation: 'pulse pulse 2s' })).toContain('animation: badgePulse badgePulse 2s');
    expect(await styleOf({ animation: 'spin 1s' })).toContain('animation: spin 1s');
    // Only the first matching name is rewritten.
    expect(await styleOf({ animation: 'pulse bounce' })).toContain('animation: badgePulse bounce');
    // A name that exists on every object must not be treated as a named animation.
    expect(await styleOf({ animation: 'constructor' })).toContain('animation: constructor');
  });

  it('turns a bare colour into a soft shadow and leaves full shadows alone', async () => {
    expect(await styleOf({ boxShadow: 'red' })).toContain('box-shadow: 0 2px 6px red');
    expect(await styleOf({ boxShadow: '0 1px 2px blue' })).toContain('box-shadow: 0 1px 2px blue');
    expect(await styleOf({ boxShadow: 'none' })).toContain('box-shadow: none');
  });
});
