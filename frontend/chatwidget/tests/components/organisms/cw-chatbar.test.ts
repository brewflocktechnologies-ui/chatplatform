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

describe('CwChatbar sizing and layout rules', () => {
  const mount = async (config: object | undefined, props: Partial<CwChatbar> = {}) => {
    document.body.innerHTML = '';
    const el = new CwChatbar();
    el.config = config as never;
    Object.assign(el, props);
    document.body.appendChild(el);
    await el.updateComplete;
    return el;
  };
  const wrapper = (el: CwChatbar) => el.shadowRoot!.querySelector('.chatbar-wrapper') as HTMLElement | null;
  const style = (el: CwChatbar) => wrapper(el)!.getAttribute('style')!;
  const bar = { enabled: true, layout: 'bar' };
  const card = { enabled: true, layout: 'card' };

  it('renders nothing when disabled, unconfigured, or hidden while the panel is open', async () => {
    expect(wrapper(await mount(undefined))).toBeNull();
    expect(wrapper(await mount({ enabled: false }))).toBeNull();
    expect(wrapper(await mount({ ...bar, hideOnOpen: true }, { panelOpen: true }))).toBeNull();
    expect(wrapper(await mount({ ...bar, hideOnOpen: true }, { panelOpen: false }))).not.toBeNull();
  });

  it('keeps the bar between its width and height limits, falling back to the defaults outside them', async () => {
    expect(style(await mount(bar))).toContain('width: 255px; height: 46px');
    expect(style(await mount({ ...bar, width: 99 }))).toContain('width: 255px');
    expect(style(await mount({ ...bar, width: 100 }))).toContain('width: 100px');
    expect(style(await mount({ ...bar, width: 400, height: 30 }))).toContain('width: 400px; height: 30px');
    expect(style(await mount({ ...bar, height: 80 }))).toContain('height: 80px');
    expect(style(await mount({ ...bar, height: 29 }))).toContain('height: 46px');
    expect(style(await mount({ ...bar, height: 81 }))).toContain('height: 46px');
    expect(style(await mount({ ...bar, width: 0, height: 0 }))).toContain('width: 255px; height: 46px');
  });

  it('keeps the card at least 180px wide and 120px tall, falling back to its own defaults', async () => {
    expect(style(await mount(card))).toContain('width: 250px; height: 220px');
    expect(style(await mount({ ...card, width: 179, height: 119 }))).toContain('width: 250px; height: 220px');
    expect(style(await mount({ ...card, width: 180, height: 120 }))).toContain('width: 180px; height: 120px');
    expect(style(await mount({ ...card, width: 500, height: 400 }))).toContain('width: 500px; height: 400px');
  });

  it('defaults padding and gap per layout, and treats the other layout default as unset', async () => {
    expect(style(await mount(bar))).toContain('padding: 0 18px');
    expect(style(await mount(card))).toContain('padding: 24px 20px');
    expect(style(await mount({ ...bar, padding: '24px 20px' }))).toContain('padding: 0 18px');
    expect(style(await mount({ ...card, padding: '0 18px' }))).toContain('padding: 24px 20px');
    expect(style(await mount({ ...bar, padding: '5px' }))).toContain('padding: 5px');
    expect(style(await mount({ ...card, padding: '5px' }))).toContain('padding: 5px');
    expect(style(await mount({ ...bar, padding: '' }))).toContain('padding: 0 18px');

    expect(style(await mount(bar))).toContain('gap: 0');
    expect(style(await mount(card))).toContain('gap: 12px');
    expect(style(await mount({ ...bar, gap: 12 }))).toContain('gap: 0');
    expect(style(await mount({ ...card, gap: 0 }))).toContain('gap: 12px');
    expect(style(await mount({ ...bar, gap: 6 }))).toContain('gap: 6px');
    expect(style(await mount({ ...card, gap: 6 }))).toContain('gap: 6px');
  });

  it('positions the bar from its offsets, treating zero as a real value', async () => {
    expect(style(await mount(bar))).toContain('bottom: 16px; right: 16px');
    expect(style(await mount({ ...bar, offsetBottom: 4, offsetRight: 8 }))).toContain('bottom: 4px; right: 8px');
    expect(style(await mount({ ...bar, offsetBottom: 0, offsetRight: 0 }))).toContain('bottom: 0px; right: 0px');
    expect(style(await mount(bar, { fixed: false }))).toContain('position: absolute');
    expect(style(await mount(bar))).toContain('position: fixed');
  });

  it('lays the card out as a column and the bar as a row', async () => {
    expect(style(await mount(card))).toContain('flex-direction: column');
    expect(style(await mount(bar))).toContain('flex-direction: row');
    const c = await mount(card);
    expect(c.shadowRoot!.querySelector('.card-layout')).not.toBeNull();
    expect(c.shadowRoot!.querySelector('.bar-layout')).toBeNull();
    const b = await mount(bar);
    expect(b.shadowRoot!.querySelector('.bar-layout')).not.toBeNull();
    expect(b.shadowRoot!.querySelector('.card-layout')).toBeNull();
  });

  it('scales on hover, labels itself by panel state, and drops the shadow when turned off', async () => {
    expect(style(await mount(bar, { hovered: true }))).toContain('transform: scale(1.02)');
    expect(style(await mount(bar))).toContain('transform: scale(1.0)');
    expect(wrapper(await mount(bar))!.getAttribute('aria-label')).toBe('Open chat');
    expect(wrapper(await mount(bar, { panelOpen: true }))!.getAttribute('aria-label')).toBe('Close chat');
    expect(style(await mount(bar))).toContain('box-shadow: 0 8px 24px');
    expect(style(await mount({ ...bar, shadow: false }))).toContain('box-shadow: none');
  });

  it('shows the bar text on one line and the card text with its fallbacks', async () => {
    const text = (el: CwChatbar) => el.shadowRoot!.querySelector('.bar-layout span')!.textContent!.trim();
    expect(text(await mount({ ...bar, text: 'Chat\nwith\nus' }))).toBe('Chat with us');
    expect(text(await mount(bar))).toBe('Chat with us');
    const cardText = (el: CwChatbar) => el.shadowRoot!.querySelector('.card-layout > div:nth-child(2)')!.textContent!.trim();
    expect(cardText(await mount({ ...card, cardText: 'Card!', text: 'Bar' }))).toBe('Card!');
    expect(cardText(await mount({ ...card, text: 'Bar' }))).toBe('Bar');
    expect(cardText(await mount(card))).toBe('Questions about PhonePe for business?');
    const button = (el: CwChatbar) => el.shadowRoot!.querySelector('.card-layout > div:nth-child(3) span')!.textContent;
    expect(button(await mount({ ...card, buttonText: 'Talk' }))).toBe('Talk');
    expect(button(await mount(card))).toBe('Chat Now');
  });

  it('draws the bar icon sized to the bar, as an image, a custom SVG or a named icon', async () => {
    const icon = (el: CwChatbar) => el.shadowRoot!.querySelector('.bar-layout cw-icon') as any;
    const img = await mount({ ...bar, iconType: 'image', iconImageUrl: 'http://i/a.png', iconOpacity: 0, iconWidth: 40, iconHeight: 40, height: 40 });
    const tag = img.shadowRoot!.querySelector('.bar-layout img') as HTMLImageElement;
    expect(tag.getAttribute('src')).toBe('http://i/a.png');
    expect(tag.getAttribute('style')).toContain('opacity: 0');
    expect(tag.getAttribute('style')).toContain('width: 20px; height: 20px');

    const svg = icon(await mount({ ...bar, iconType: 'customSvg', customSvg: '<svg></svg>', iconWidth: 40, height: 40, iconColor: 'red' }));
    expect([svg.customSvg, svg.size, svg.color]).toEqual(['<svg></svg>', 22, 'red']);

    expect(icon(await mount({ ...bar, lucideIcon: 'Bell' })).name).toBe('Bell');
    expect(icon(await mount(bar)).name).toBe('MessageCircle');
    // An image or SVG type without a source falls back to the named icon.
    expect(icon(await mount({ ...bar, iconType: 'image' })).name).toBe('MessageCircle');
    expect(icon(await mount({ ...bar, iconType: 'customSvg' })).name).toBe('MessageCircle');
  });

  it('draws the card icon at its own size, as an image, a custom SVG or a named icon', async () => {
    const icon = (el: CwChatbar) => el.shadowRoot!.querySelector('.card-layout cw-icon') as any;
    const img = await mount({ ...card, iconType: 'image', iconImageUrl: 'http://i/a.png', iconWidth: 50, iconHeight: 60, iconBlend: 'screen' });
    const tag = img.shadowRoot!.querySelector('.card-layout img') as HTMLImageElement;
    expect(tag.getAttribute('style')).toContain('width: 50px; height: 60px');
    expect(tag.getAttribute('style')).toContain('opacity: 1');
    expect(tag.getAttribute('style')).toContain('mix-blend-mode: screen');

    const svg = icon(await mount({ ...card, iconType: 'customSvg', customSvg: '<svg></svg>', textColor: 'blue' }));
    expect([svg.size, svg.color]).toEqual([36, 'blue']);
    expect(icon(await mount(card)).name).toBe('MessageSquare');
    expect(icon(await mount({ ...card, lucideIcon: 'Star', iconColor: 'gold' })).color).toBe('gold');
  });

  it('shows the unread badge in both layouts, only when there are unread messages', async () => {
    for (const layout of [bar, card]) {
      const badge = (await mount({ ...layout, badge: { size: 12 } }, { unreadCount: 5 })).shadowRoot!.querySelector('cw-badge') as any;
      expect(badge.count).toBe(5);
      expect((await mount(layout, { unreadCount: 0 })).shadowRoot!.querySelector('cw-badge')).toBeNull();
    }
  });
});
