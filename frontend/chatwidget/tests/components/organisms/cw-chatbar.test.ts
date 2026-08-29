import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../../../components/organisms/cw-chatbar.js';
import { CwChatbar } from '../../../components/organisms/cw-chatbar.js';

describe('CwChatbar Organism Component', () => {
  let element: CwChatbar;

  beforeEach(async () => {
    document.body.innerHTML = '';
    element = new CwChatbar();
    element.config = {
      enabled: true,
      useWebsiteTheme: true,
      position: 'bottom-right',
      offsetLeft: 16,
      offsetRight: 16,
      offsetBottom: 16,
      text: 'Talk with us',
      barText: 'Talk with us',
      bgColor: '#0b5fff',
      textColor: '#ffffff',
      textSize: 14,
      letterSpacing: 0,
      gradientEnabled: false,
      gradientStops: [],
      gradientType: 'linear',
      gradientAngle: 135,
      iconType: 'lucide',
      iconColor: '#ffffff',
      lucideIcon: 'MessageSquare',
      iconImageUrl: '',
      iconFit: 'contain',
      iconOpacity: 1,
      iconBlend: 'normal',
      iconWidth: 20,
      iconHeight: 20,
      width: 180,
      height: 48,
      shadow: true,
      borderRadius: 24,
      hideOnOpen: false,
    };
    document.body.appendChild(element);
    await element.updateComplete;
  });

  it('should instantiate and mount cw-chatbar element', () => {
    expect(element).toBeDefined();
    expect(element.tagName.toLowerCase()).toBe('cw-chatbar');
  });

  it('should dispatch cw:toggle event when clicked or keydown Enter/Space', async () => {
    const spy = vi.fn();
    element.addEventListener('cw:toggle', spy);
    const wrapper = element.shadowRoot?.querySelector('.chatbar-wrapper') as HTMLElement;
    wrapper?.click();
    expect(spy).toHaveBeenCalled();

    wrapper?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(spy).toHaveBeenCalledTimes(2);

    wrapper?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('handles hover states (mouseenter, mouseleave)', async () => {
    const wrapper = element.shadowRoot?.querySelector('.chatbar-wrapper') as HTMLElement;
    wrapper.dispatchEvent(new Event('mouseenter'));
    await element.updateComplete;

    wrapper.dispatchEvent(new Event('mouseleave'));
    await element.updateComplete;
  });

  it('renders image and customSvg in bar layout with unread badge', async () => {
    element.config = {
      ...element.config!,
      layout: 'bar',
      iconType: 'image',
      iconImageUrl: 'http://example.com/icon.png',
    };
    element.unreadCount = 3;
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('img')).not.toBeNull();
    expect(element.shadowRoot?.querySelector('cw-badge')).not.toBeNull();

    element.config = {
      ...element.config!,
      layout: 'bar',
      iconType: 'customSvg',
      customSvg: '<svg></svg>',
    };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('cw-icon')).not.toBeNull();
  });

  it('renders card layout and handles different icon types (image, customSvg, lucide)', async () => {
    element.config = {
      ...element.config!,
      layout: 'card',
      cardText: 'Any questions?',
      buttonText: 'Start Chat',
      iconType: 'image',
      iconImageUrl: 'http://example.com/icon.png',
    };
    element.unreadCount = 2;
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('.card-layout')).not.toBeNull();
    expect(element.shadowRoot?.querySelector('cw-badge')).not.toBeNull();

    element.config = {
      ...element.config!,
      layout: 'card',
      iconType: 'customSvg',
      customSvg: '<svg></svg>',
    };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('cw-icon')).not.toBeNull();
  });

  it('handles enabled = false, hideOnOpen = true with panelOpen, fixed = false, non-Enter keydown, and fallbacks', async () => {
    // 1. enabled = false
    element.config = { enabled: false };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.chatbar-wrapper')).toBeNull();

    // 2. hideOnOpen = true and panelOpen = true
    element.config = { enabled: true, hideOnOpen: true };
    element.panelOpen = true;
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.chatbar-wrapper')).toBeNull();

    // 3. hideOnOpen = false, panelOpen = true, fixed = false, shadow = false, custom padding/gap
    element.config = {
      enabled: true,
      hideOnOpen: false,
      shadow: false,
      padding: '10px 15px',
      gap: 8,
      width: 50, // bar width < 100 fallback 255
      height: 200, // bar height > 80 fallback 46
      textSize: undefined,
      text: 'Hello\nWorld',
    };
    element.fixed = false;
    element.panelOpen = true;
    await element.updateComplete;

    const wrapper = element.shadowRoot?.querySelector('.chatbar-wrapper') as HTMLElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper.getAttribute('aria-label')).toBe('Close chat');
    expect(wrapper.style.position).toBe('absolute');

    // 4. Non-Enter/Space keydown
    const spy = vi.fn();
    element.addEventListener('cw:toggle', spy);
    wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(spy).not.toHaveBeenCalled();

    // 5. Card layout with width/height bounds fallback & text fallbacks
    element.config = {
      enabled: true,
      layout: 'card',
      width: 100, // card width < 180 fallback 250
      height: 50, // card height < 120 fallback 220px
      iconType: 'lucide',
    };
    element.panelOpen = false;
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.card-layout')).not.toBeNull();

    // 6. Bar layout with default text and lucideIcon fallbacks and iconColor fallback
    element.config = {
      enabled: true,
      layout: 'bar',
      text: undefined,
      lucideIcon: undefined,
      iconType: 'customSvg',
      customSvg: '<svg></svg>',
      iconColor: undefined,
      height: 46,
    };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.bar-layout')).not.toBeNull();

    // 7. Card & Bar layout with iconOpacity, iconColor, iconWidth, iconFit, iconBlend
    element.config = {
      enabled: true,
      layout: 'card',
      iconType: 'image',
      iconImageUrl: 'http://example.com/icon.png',
      iconOpacity: 0.8,
      iconWidth: 30,
      iconHeight: 30,
      textColor: undefined,
      cardText: undefined,
      buttonText: undefined,
    };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.card-layout')).not.toBeNull();

    element.config = {
      enabled: true,
      layout: 'bar',
      iconType: 'image',
      iconImageUrl: 'http://example.com/icon.png',
      iconOpacity: 0.8,
      iconFit: 'cover',
      iconBlend: 'multiply',
      height: '46px' as any,
    };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.bar-layout')).not.toBeNull();

    // 8. Card & Bar layout customSvg with textColor defined vs iconColor defined
    element.config = {
      enabled: true,
      layout: 'card',
      iconType: 'customSvg',
      customSvg: '<svg></svg>',
      textColor: '#ff0000',
      iconColor: undefined,
    };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.card-layout')).not.toBeNull();

    element.config = {
      enabled: true,
      layout: 'bar',
      iconType: 'lucide',
      lucideIcon: 'MessageCircle',
      height: '46px' as any,
    };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.bar-layout')).not.toBeNull();

    // 9. Card & Bar layout image icon with iconOpacity = undefined (fallback 1) & Card customSvg with both iconColor/textColor undefined
    element.config = {
      enabled: true,
      layout: 'card',
      iconType: 'image',
      iconImageUrl: 'http://example.com/icon.png',
      iconOpacity: undefined,
    };
    await element.updateComplete;

    element.config = {
      enabled: true,
      layout: 'card',
      iconType: 'customSvg',
      customSvg: '<svg></svg>',
      iconColor: undefined,
      textColor: undefined,
    };
    await element.updateComplete;

    element.config = {
      enabled: true,
      layout: 'bar',
      iconType: 'image',
      iconImageUrl: 'http://example.com/icon.png',
      iconOpacity: undefined,
    };
    await element.updateComplete;

    element.config = {
      enabled: true,
      layout: 'bar',
      iconType: 'customSvg',
      customSvg: '<svg></svg>',
      iconWidth: 24,
    };
    await element.updateComplete;

    // 10. config = undefined, card height >= 120, card padding = '0 18px' / gap = 0, bar padding = '24px 20px' / gap = 12
    element.config = undefined as any;
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.chatbar-wrapper')).toBeNull();

    element.config = {
      enabled: true,
      layout: 'card',
      height: 150,
      padding: '0 18px',
      gap: 0,
    };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.card-layout')).not.toBeNull();

    element.config = {
      enabled: true,
      layout: 'bar',
      padding: '24px 20px',
      gap: 12,
    };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.bar-layout')).not.toBeNull();
  });
});
