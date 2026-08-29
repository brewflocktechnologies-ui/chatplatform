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
