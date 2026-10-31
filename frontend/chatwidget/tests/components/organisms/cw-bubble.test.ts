import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../../../components/organisms/cw-bubble.js';
import { CwBubble } from '../../../components/organisms/cw-bubble.js';

describe('CwBubble Organism Component', () => {
  let element: CwBubble;

  beforeEach(async () => {
    document.body.innerHTML = '';
    element = new CwBubble();
    element.config = {
      useWebsiteTheme: true,
      position: 'bottom-right',
      offsetLeft: 16,
      offsetRight: 16,
      offsetBottom: 16,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: '#0b5fff',
      gradientType: 'none',
      gradientStops: [],
      backgroundOverlayType: 'none',
      backgroundImageUrl: '',
      backgroundImageSize: 'cover',
      backgroundImageOpacity: 1,
      backgroundBlendMode: 'normal',
      border: { width: 0, color: '', style: 'none' },
      outlineRing: { enabled: false, width: 0, color: '', opacity: 1 },
      boxShadowBlur: 10,
      boxShadowSpread: 0,
      boxShadowOffsetX: 0,
      boxShadowOffsetY: 4,
      boxShadowOpacity: 0.15,
      dots: { color: '#ffffff', size: 6, spacing: 4, animation: 'bounce' },
      hideOnOpen: true,
    };
    document.body.appendChild(element);
    await element.updateComplete;
  });

  it('should instantiate and mount cw-bubble element', () => {
    expect(element).toBeDefined();
    expect(element.tagName.toLowerCase()).toBe('cw-bubble');
  });

  it('should dispatch cw:toggle event when clicked or Enter/Space pressed', async () => {
    const spy = vi.fn();
    element.addEventListener('cw:toggle', spy);
    const wrapper = element.shadowRoot?.querySelector('.bubble-wrapper') as HTMLElement;
    wrapper?.click();
    expect(spy).toHaveBeenCalled();

    wrapper?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(spy).toHaveBeenCalledTimes(2);

    wrapper?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(spy).toHaveBeenCalledTimes(3);

    element.focus();
  });

  it('renders glass, neon, border, innerShadow, and idleAnim features', async () => {
    // 1. With explicit config options
    element.config = {
      ...element.config!,
      glass: { enabled: true, blur: 10, bgOpacity: 0.8 },
      neon: { enabled: true, color: '#00ffff', intensity: 0.8 },
      border: { width: 2, color: '#ff0000', style: 'solid' },
      innerShadow: { enabled: true, color: '#000000', blur: 4 },
      idleAnim: { enabled: true, type: 'float', amplitude: 4 },
    };
    await element.updateComplete;

    let wrapper = element.shadowRoot?.querySelector('.bubble-wrapper') as HTMLElement;
    expect(wrapper.style.cssText).toContain('backdrop-filter');
    expect(wrapper.style.cssText).toContain('box-shadow');
    expect(wrapper.style.cssText).toContain('idleFloat');

    // 2. With default fallbacks for glass, neon, and border
    element.config = {
      ...element.config!,
      glass: { enabled: true },
      neon: { enabled: true },
      border: { width: 2 },
    };
    await element.updateComplete;
    wrapper = element.shadowRoot?.querySelector('.bubble-wrapper') as HTMLElement;
    expect(wrapper.style.cssText).toContain('backdrop-filter');
    expect(wrapper.style.cssText).toContain('box-shadow');
  });

  it('should render unread count badge when unreadCount > 0', async () => {
    element.unreadCount = 4;
    element.panelOpen = false;
    await element.updateComplete;

    const badge = element.shadowRoot?.querySelector('cw-badge');
    expect(badge).not.toBeNull();
  });

  it('renders background overlays (image and lucide) and outline ring', async () => {
    element.config = {
      ...element.config!,
      backgroundOverlayType: 'image',
      backgroundImageUrl: 'http://example.com/bg.png',
      outlineRing: { enabled: true, width: 3, color: '#00ffff', opacity: 0.5 },
    };
    await element.updateComplete;

    const overlay = element.shadowRoot?.querySelector('.overlay-img');
    expect(overlay).not.toBeNull();

    element.config = {
      ...element.config!,
      backgroundOverlayType: 'lucide',
      backgroundLucideIcon: 'Sparkles',
    };
    await element.updateComplete;

    const iconOverlay = element.shadowRoot?.querySelector('.overlay-icon');
    expect(iconOverlay).not.toBeNull();
  });

  it('renders image, customSvg, and lucide icon types', async () => {
    element.config = {
      ...element.config!,
      iconType: 'image',
      iconImageUrl: 'http://example.com/icon.png',
    };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.icon-container img')).not.toBeNull();

    element.config = {
      ...element.config!,
      iconType: 'customSvg',
      customSvg: '<svg></svg>',
    };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('cw-icon')).not.toBeNull();

    element.config = {
      ...element.config!,
      iconType: 'lucide',
      lucideIcon: 'MessageSquare',
    };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('cw-icon')).not.toBeNull();
  });

  it('renders tooltip for all positions (left, right, top, bottom) with and without border', async () => {
    const positions = ['right', 'top', 'bottom', 'left'] as const;
    for (const borderWidth of [1, 0]) {
      for (const pos of positions) {
        element.config = {
          ...element.config!,
          tooltip: {
            enabled: true,
            text: 'Tooltip text',
            position: pos,
            borderWidth,
            borderColor: '#000',
            backgroundColor: '#0f172a',
            textColor: '#ffffff',
            fontSize: 12,
            borderRadius: 8,
            padding: '6px 10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            arrowEnabled: true,
          },
        };
        element.panelOpen = false;
        element.hasSentMessage = false;
        await element.updateComplete;

        const tooltip = element.shadowRoot?.querySelector('cw-tooltip');
        expect(tooltip).not.toBeNull();
      }
    }
  });

  it('renders dots animation container when hovered', async () => {
    element.config = {
      ...element.config!,
      dots: { color: '#ffffff', size: 6, spacing: 4, animation: 'bounce' },
    };
    element.panelOpen = false;
    await element.updateComplete;

    const wrapper = element.shadowRoot?.querySelector('.bubble-wrapper') as HTMLElement;
    wrapper.dispatchEvent(new Event('mouseenter'));
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('.dots-container')).not.toBeNull();

    // Mouseenter while panelOpen = true
    element.panelOpen = true;
    await element.updateComplete;
    wrapper.dispatchEvent(new Event('mouseenter'));
    await element.updateComplete;

    wrapper.dispatchEvent(new Event('mouseleave'));
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.dots-container')).toBeNull();
  });

  it('renders positions bottom-left, top-right, and top-left with offsetTop and hoverScale', async () => {
    const positions = ['bottom-left', 'top-right', 'top-left'] as const;
    for (const pos of positions) {
      element.config = {
        ...element.config!,
        position: pos,
        offsetTop: 20,
        hoverScale: 1.1,
      };
      await element.updateComplete;
      const wrapper = element.shadowRoot?.querySelector('.bubble-wrapper') as HTMLElement;
      expect(wrapper).not.toBeNull();
    }
  });

  it('handles empty config, panelOpen ChevronDown, non-Enter/Space keydown, pulse dots animation, and icon fallbacks', async () => {
    // 1. empty config
    element.config = undefined as any;
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.bubble-wrapper')).toBeNull();

    // 2. hideOnOpen = true and panelOpen = true
    element.config = { hideOnOpen: true };
    element.panelOpen = true;
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.bubble-wrapper')).toBeNull();

    // 3. hideOnOpen = false and panelOpen = true (shows ChevronDown)
    element.config = { hideOnOpen: false };
    element.panelOpen = true;
    await element.updateComplete;
    const iconContainer = element.shadowRoot?.querySelector('.icon-container');
    expect(iconContainer).not.toBeNull();

    // 4. Non-Enter/Space keydown
    element.panelOpen = false;
    element.config = { hideOnOpen: false };
    await element.updateComplete;

    const wrapper = element.shadowRoot?.querySelector('.bubble-wrapper') as HTMLElement;
    const spy = vi.fn();
    element.addEventListener('cw:toggle', spy);
    wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(spy).not.toHaveBeenCalled();

    // 5. Dots animation with pulse and bounce
    element.config = {
      dots: { animation: 'bounce' },
      boxShadowBlur: 0,
      boxShadowOpacity: 0,
    };
    wrapper.dispatchEvent(new Event('mouseenter'));
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.dots-container')).not.toBeNull();

    element.config = {
      dots: { animation: 'pulse' },
    };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.dots-container')).not.toBeNull();
    wrapper.dispatchEvent(new Event('mouseleave'));

    // 6. Image icon type with iconOpacity, iconFit, iconBlend & backgroundOverlayType image/lucide with default opacity fallbacks & fixed = false
    element.fixed = false;
    element.config = {
      iconType: 'image',
      iconImageUrl: 'http://example.com/icon.png',
      iconOpacity: 0.8,
      iconFit: 'contain',
      iconBlend: 'multiply',
      backgroundOverlayType: 'image',
      backgroundImageUrl: 'http://example.com/bg.png',
      outlineRing: { enabled: true },
    };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.overlay-img')).not.toBeNull();
    expect(element.shadowRoot?.querySelector('.icon-container img')).not.toBeNull();

    element.config = {
      iconType: 'image',
      backgroundImageUrl: 'http://example.com/bg.png',
      backgroundOverlayType: 'lucide',
      backgroundLucideIcon: 'Star',
    };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.overlay-icon')).not.toBeNull();
    expect(element.shadowRoot?.querySelector('.icon-container img')).not.toBeNull();

    // 7. Tooltip enabled with default fallbacks
    element.config = {
      iconType: 'lucide',
      backgroundLucideIcon: 'Star',
      tooltip: { enabled: true },
    };
    element.panelOpen = false;
    element.hasSentMessage = false;
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('cw-tooltip')).not.toBeNull();
  });
});

describe('CwBubble launcher styling', () => {
  const mount = async (config: object | undefined, props: Partial<CwBubble> = {}) => {
    document.body.innerHTML = '';
    const el = new CwBubble();
    el.config = config as never;
    Object.assign(el, props);
    document.body.appendChild(el);
    await el.updateComplete;
    return el;
  };
  const wrapper = (el: CwBubble) => el.shadowRoot!.querySelector('.bubble-wrapper') as HTMLElement | null;
  const style = (el: CwBubble) => wrapper(el)!.getAttribute('style')!;

  it('renders nothing without a config, or when hidden while the panel is open', async () => {
    expect(wrapper(await mount(undefined))).toBeNull();
    expect(wrapper(await mount({ hideOnOpen: true }, { panelOpen: true }))).toBeNull();
    expect(wrapper(await mount({ hideOnOpen: true }, { panelOpen: false }))).not.toBeNull();
  });

  it('anchors the launcher to each corner with its own offsets and defaults', async () => {
    expect(style(await mount({}))).toContain('bottom: 12px; right: 16px;');
    expect(style(await mount({ position: 'bottom-left', offsetBottom: 3, offsetLeft: 4 }))).toContain('bottom: 3px; left: 4px;');
    expect(style(await mount({ position: 'top-right', offsetTop: 5, offsetRight: 6 }))).toContain('top: 5px; right: 6px;');
    expect(style(await mount({ position: 'top-left' }))).toContain('top: 12px; left: 16px;');
    expect(style(await mount({ position: 'nowhere' }))).toContain('bottom: 12px; right: 16px;');
    // Zero is a real offset, not "unset".
    expect(style(await mount({ offsetBottom: 0, offsetRight: 0 }))).toContain('bottom: 0px; right: 0px;');
  });

  it('sizes the launcher and switches between fixed and absolute positioning', async () => {
    expect(style(await mount({}))).toContain('width: 60px; height: 60px');
    expect(style(await mount({ width: 80, height: 70 }))).toContain('width: 80px; height: 70px');
    expect(style(await mount({}, { fixed: false }))).toContain('position: absolute');
    expect(style(await mount({}))).toContain('position: fixed');
  });

  it('adds the glass, neon and border effects only when enabled', async () => {
    expect(style(await mount({}))).not.toContain('backdrop-filter');
    expect(style(await mount({ glass: { enabled: false } }))).not.toContain('backdrop-filter');
    expect(style(await mount({ glass: { enabled: true } }))).toContain('backdrop-filter: blur(10px)');
    expect(style(await mount({ glass: { enabled: true, blur: 4, bgOpacity: 0.6 } }))).toContain('rgba(255, 255, 255, 0.6)');

    expect(style(await mount({ neon: { enabled: false } }))).not.toContain('inset 0 0');
    expect(style(await mount({ neon: { enabled: true } }))).toContain('0 0 16px #22d3ee, inset 0 0 8px #22d3ee');
    expect(style(await mount({ neon: { enabled: true, color: 'lime', intensity: 2 } }))).toContain('0 0 40px lime');

    expect(style(await mount({ border: { width: 0 } }))).not.toMatch(/ border: \d/);
    expect(style(await mount({ border: { width: 3 } }))).toContain('border: 3px solid transparent;');
    expect(style(await mount({ border: { width: 2, style: 'dashed', color: 'red' } }))).toContain('border: 2px dashed red;');
  });

  it('floats while idle, but not while hovered, open, disabled or set to none', async () => {
    const idle = { idleAnim: { enabled: true, type: 'float', duration: 1500 } };
    expect(style(await mount(idle))).toContain('animation: idleFloat 1500ms ease-in-out infinite;');
    expect(style(await mount({ idleAnim: { enabled: true, type: 'float' } }))).toContain('idleFloat 3200ms');
    expect(style(await mount(idle, { panelOpen: true }))).not.toContain('idleFloat');
    expect(style(await mount(idle, { hovered: true }))).not.toContain('idleFloat');
    expect(style(await mount({ idleAnim: { enabled: false, type: 'float' } }))).not.toContain('idleFloat');
    expect(style(await mount({ idleAnim: { enabled: true, type: 'none' } }))).not.toContain('idleFloat');
  });

  it('scales up on hover unless the panel is open', async () => {
    expect(style(await mount({}, { hovered: true }))).toContain('transform: scale(1.05)');
    expect(style(await mount({ hoverScale: 1.3 }, { hovered: true }))).toContain('transform: scale(1.3)');
    expect(style(await mount({ hoverScale: 0 }, { hovered: true }))).toContain('transform: scale(0)');
    expect(style(await mount({}, { hovered: true, panelOpen: true }))).toContain('transform: scale(1.0)');
    expect(style(await mount({}))).toContain('transform: scale(1.0)');
    expect(wrapper(await mount({}))!.getAttribute('aria-label')).toBe('Open chat');
    expect(wrapper(await mount({}, { panelOpen: true }))!.getAttribute('aria-label')).toBe('Close chat');
  });

  it('draws the background overlay image or icon', async () => {
    const image = await mount({ backgroundOverlayType: 'image', backgroundImageUrl: 'http://b/i.png', backgroundImageOpacity: 0.5 });
    expect(image.shadowRoot!.querySelector('.overlay-img')!.getAttribute('style')).toContain('opacity: 0.5');
    expect((await mount({ backgroundOverlayType: 'image' })).shadowRoot!.querySelector('.overlay-img')).toBeNull();
    const icon = await mount({ backgroundOverlayType: 'lucide', backgroundLucideIcon: 'Star', backgroundLucideSize: 30 });
    expect((icon.shadowRoot!.querySelector('.overlay-icon cw-icon') as any).size).toBe(30);
    expect((await mount({ backgroundOverlayType: 'lucide' })).shadowRoot!.querySelector('.overlay-icon')).toBeNull();
  });

  it('chooses the launcher glyph: image, custom SVG, or a named icon', async () => {
    const img = await mount({ iconType: 'image', iconImageUrl: 'http://i/a.png', iconOpacity: 0, iconFit: 'contain' });
    const tag = img.shadowRoot!.querySelector('.icon-container img') as HTMLImageElement;
    expect(tag.getAttribute('src')).toBe('http://i/a.png');
    expect(tag.getAttribute('style')).toContain('opacity: 0');
    expect(tag.getAttribute('style')).toContain('object-fit: contain');
    // With no icon image, the background image is reused.
    expect((await mount({ iconType: 'image', backgroundImageUrl: 'http://b/i.png' })).shadowRoot!.querySelector('.icon-container img')!.getAttribute('src')).toBe('http://b/i.png');

    const svg = await mount({ iconType: 'customSvg', customSvg: '<svg></svg>', iconWidth: 40, iconColor: 'red' });
    const svgIcon = svg.shadowRoot!.querySelector('.icon-container cw-icon') as any;
    expect([svgIcon.customSvg, svgIcon.size, svgIcon.color]).toEqual(['<svg></svg>', 40, 'red']);

    const named = (el: CwBubble) => (el.shadowRoot!.querySelector('.icon-container cw-icon') as any).name;
    expect(named(await mount({ lucideIcon: 'Bell' }))).toBe('Bell');
    expect(named(await mount({ backgroundLucideIcon: 'Star' }))).toBe('Star');
    expect(named(await mount({}))).toBe('MessageSquare');
    // An image or SVG type without its source falls back to the named icon.
    expect(named(await mount({ iconType: 'image' }))).toBe('MessageSquare');
    expect(named(await mount({ iconType: 'customSvg' }))).toBe('MessageSquare');
    expect(named(await mount({}, { panelOpen: true }))).toBe('ChevronDown');
  });

  it('shows animated dots on hover, bouncing or pulsing, in place of the icon', async () => {
    const bounce = await mount({ dots: { animation: 'bounce', size: 8, spacing: 3, color: 'red' } }, { hovered: true });
    const spans = Array.from(bounce.shadowRoot!.querySelectorAll('.dot-span')) as HTMLElement[];
    expect(spans).toHaveLength(3);
    expect(spans[1].getAttribute('style')).toContain('dotBounce 1.2s cubic-bezier(.2,.8,.2,1) 0.12s infinite');
    expect(spans[0].getAttribute('style')).toContain('width: 8px');
    expect(spans[0].getAttribute('style')).toContain('background-color: red');
    expect(bounce.shadowRoot!.querySelector('.icon-container')).toBeNull();
    expect(bounce.shadowRoot!.querySelector('.dots-container')!.getAttribute('style')).toContain('gap: 3px');

    const pulse = await mount({ dots: { animation: 'pulse' } }, { hovered: true });
    expect(pulse.shadowRoot!.querySelectorAll('.dot-span')[2].getAttribute('style')).toContain('dotPulse 1.4s cubic-bezier(.2,.8,.2,1) 0.2s infinite');

    // No dots without an animation, when not hovered, or while the panel is open.
    for (const [config, props] of [
      [{ dots: { animation: 'none' } }, { hovered: true }],
      [{ dots: { animation: 'bounce' } }, { hovered: false }],
      [{ dots: { animation: 'bounce' } }, { hovered: true, panelOpen: true }],
      [{}, { hovered: true }]
    ] as const) {
      expect((await mount(config, props)).shadowRoot!.querySelector('.dots-container')).toBeNull();
    }
  });

  it('adds an outline ring and an unread badge when asked', async () => {
    const ring = await mount({ outlineRing: { enabled: true, width: 5, color: '#ff0000', opacity: 0.5 } });
    expect(ring.shadowRoot!.innerHTML).toContain('0 0 0 5px');
    expect((await mount({ outlineRing: { enabled: false } })).shadowRoot!.innerHTML).not.toContain('0 0 0 3px');

    const badge = await mount({ badge: { size: 14 } }, { unreadCount: 4 });
    expect((badge.shadowRoot!.querySelector('cw-badge') as any).count).toBe(4);
    expect((await mount({}, { unreadCount: 0 })).shadowRoot!.querySelector('cw-badge')).toBeNull();
  });

  it('shows the tooltip only while closed and before the visitor has written', async () => {
    const tip = { enabled: true, text: 'Hi!', position: 'top', arrowEnabled: false, borderWidth: 2 };
    const shown = (await mount({ tooltip: tip })).shadowRoot!.querySelector('cw-tooltip') as any;
    expect([shown.text, shown.position, shown.arrowEnabled, shown.borderWidth]).toEqual(['Hi!', 'top', false, 2]);
    expect((await mount({ tooltip: tip }, { panelOpen: true })).shadowRoot!.querySelector('cw-tooltip')).toBeNull();
    expect((await mount({ tooltip: tip }, { hasSentMessage: true })).shadowRoot!.querySelector('cw-tooltip')).toBeNull();
    expect((await mount({ tooltip: { ...tip, enabled: false } })).shadowRoot!.querySelector('cw-tooltip')).toBeNull();
    expect((await mount({})).shadowRoot!.querySelector('cw-tooltip')).toBeNull();

    const defaults = (await mount({ tooltip: { enabled: true } })).shadowRoot!.querySelector('cw-tooltip') as any;
    expect([defaults.text, defaults.position, defaults.fontSize, defaults.padding, defaults.arrowEnabled]).toEqual(['Chat with us', 'left', 14, '8px 16px', true]);
  });
});
