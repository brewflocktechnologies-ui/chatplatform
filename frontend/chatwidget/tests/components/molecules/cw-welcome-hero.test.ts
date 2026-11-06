import { describe, it, expect, beforeEach } from 'vitest';
import '../../../components/molecules/cw-welcome-hero.js';
import { CwWelcomeHero } from '../../../components/molecules/cw-welcome-hero.js';

describe('CwWelcomeHero Molecule Component', () => {
  let element: CwWelcomeHero;

  beforeEach(async () => {
    document.body.innerHTML = '';
    element = new CwWelcomeHero();
    document.body.appendChild(element);
    await element.updateComplete;
  });

  it('should instantiate and mount cw-welcome-hero element', () => {
    expect(element).toBeDefined();
    expect(element.tagName.toLowerCase()).toBe('cw-welcome-hero');
  });

  it('should render title, description, and team avatars', async () => {
    element.config = {
      title: 'Hi there! 👋 How can we help?',
      description: 'Our support team is online.',
      avatars: [
        { url: 'http://example.com/avatar1.png', name: 'Agent' },
        { url: 'http://example.com/avatar2.png', name: 'Alex' },
      ],
    };
    element.isGlassy = true;
    await element.updateComplete;

    const title = element.shadowRoot?.querySelector('.welcome-title');
    expect(title?.textContent?.trim()).toContain('Hi there!');

    const desc = element.shadowRoot?.querySelector('.welcome-desc');
    expect(desc?.textContent?.trim()).toContain('Our support team is online.');

    const avatars = element.shadowRoot?.querySelectorAll('cw-avatar');
    expect(avatars?.length).toBe(2);
  });

  it('renders logoOnly layout', async () => {
    element.logoOnly = true;
    element.config = { logoUrl: 'http://example.com/logo.png', logoAlt: 'Logo' };
    await element.updateComplete;

    const img = element.shadowRoot?.querySelector('.logo-img');
    expect(img).not.toBeNull();
  });

  it('resolves avatar string and object URLs cleanly', async () => {
    element.config = {
      avatars: [{ url: 'http://example.com/avatar-str.png', name: 'Agent' }],
    };
    await element.updateComplete;

    const avatar = element.shadowRoot?.querySelector('cw-avatar');
    expect(avatar).not.toBeNull();
    expect((element as any).resolveAvatarUrl('http://example.com/direct.png')).toBe('http://example.com/direct.png');
    expect((element as any).resolveAvatarUrl('[object Object]')).toBe('');
    expect((element as any).resolveAvatarUrl({ src: 'http://example.com/src.png' })).toBe('http://example.com/src.png');
    expect((element as any).resolveAvatarUrl({ avatar: 'http://example.com/av.png' })).toBe('http://example.com/av.png');
    expect((element as any).resolveAvatarUrl({ imageUrl: 'http://example.com/img.png' })).toBe('http://example.com/img.png');
    expect((element as any).resolveAvatarUrl({})).toBe('');
    expect((element as any).resolveAvatarUrl(null)).toBe('');
  });

  it('handles isGlassy alignment, hideLogo, logoOnly fallback icon, and numeric/string font sizes', async () => {
    // 1. isGlassy with cardAlign = 'center'
    element.isGlassy = true;
    element.config = {
      cardAlign: 'center',
      titleFontSize: 24,
      descriptionFontSize: '15px',
      avatars: ['http://example.com/str.png', { name: 'NoUrlObj' }],
    };
    await element.updateComplete;

    let textBlock = element.shadowRoot?.querySelector('.text-block') as HTMLElement;
    expect(textBlock.getAttribute('style')).toContain('text-align: center');

    // 2. logoOnly with logoUrl and default logoAlt fallback
    element.logoOnly = true;
    element.config = { logoUrl: 'http://example.com/logo.png' };
    await element.updateComplete;
    let img = element.shadowRoot?.querySelector('.logo-img') as HTMLImageElement;
    expect(img.getAttribute('alt')).toBe('Company Logo');

    // logoOnly with no logoUrl
    element.config = {};
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('cw-icon')).not.toBeNull();

    // 3. hideLogo = true
    element.logoOnly = false;
    element.hideLogo = true;
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.logo-container')).toBeNull();

    // 4. hideLogo = false with logoUrl, default title/description fallbacks, and glassy explicit alignments
    element.hideLogo = false;
    element.isGlassy = true;
    element.config = {
      logoUrl: 'http://example.com/logo.png',
      logoAlign: 'center',
      textAlign: 'center',
      avatarAlign: 'center',
    };
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('.logo-img')).not.toBeNull();

    // glassy with no alignments, subtextColor, titleFontSize string, and descriptionFontSize number
    element.config = { logoUrl: 'http://example.com/logo.png', subtextColor: '#123456', titleFontSize: '24px', descriptionFontSize: 15, avatarBorderColor: '#ffffff', avatars: ['http://example.com/a.png'] };
    await element.updateComplete;
    textBlock = element.shadowRoot?.querySelector('.text-block') as HTMLElement;
    expect(textBlock.getAttribute('style')).toContain('text-align: left');

    const h2 = element.shadowRoot?.querySelector('.welcome-title');
    expect(h2?.textContent?.trim()).toContain('Hi there! 👋 How can we help you today?');

    const p = element.shadowRoot?.querySelector('.welcome-desc');
    expect(p?.textContent?.trim()).toBe('Our support heroes are here to assist you.');
  });
});

describe('CwWelcomeHero layout rules', () => {
  const mount = async (props: Partial<CwWelcomeHero>) => {
    document.body.innerHTML = '';
    const el = new CwWelcomeHero();
    Object.assign(el, props);
    document.body.appendChild(el);
    await el.updateComplete;
    return el;
  };
  const text = (el: CwWelcomeHero) => el.shadowRoot!.querySelector('.text-block') as HTMLElement;
  const logo = (el: CwWelcomeHero) => el.shadowRoot!.querySelector('.logo-container') as HTMLElement;
  const avatarsRow = (el: CwWelcomeHero) => el.shadowRoot!.querySelector('.avatars-row') as HTMLElement;

  it('left-aligns everything outside the glassy card, whatever the config says', async () => {
    const el = await mount({ config: { textAlign: 'center', cardAlign: 'center', logoAlign: 'center', avatarAlign: 'center' } as never });
    expect(text(el).getAttribute('style')).toContain('text-align: left');
    expect(logo(el).getAttribute('style')).toContain('justify-content: flex-start');
    expect(avatarsRow(el).getAttribute('style')).toContain('justify-content: flex-start');
    expect(logo(el).getAttribute('style')).toContain('margin-bottom: 28px');
    expect(text(el).getAttribute('style')).toContain('margin-bottom: 24px');
  });

  it('honours the configured alignment on the glassy card', async () => {
    const el = await mount({ isGlassy: true, config: { textAlign: 'right', logoAlign: 'flex-end', avatarAlign: 'center' } as never });
    expect(text(el).getAttribute('style')).toContain('text-align: right');
    expect(logo(el).getAttribute('style')).toContain('justify-content: flex-end');
    expect(avatarsRow(el).getAttribute('style')).toContain('justify-content: center');
    expect(logo(el).getAttribute('style')).toContain('margin-bottom: 20px');
    expect(text(el).getAttribute('style')).toContain('margin-bottom: 0');
  });

  it('centres the glassy card from either centre setting when no explicit alignment is given', async () => {
    for (const config of [{ textAlign: 'center' }, { cardAlign: 'center' }]) {
      const el = await mount({ isGlassy: true, config: config as never });
      expect(logo(el).getAttribute('style')).toContain('justify-content: center');
      expect(avatarsRow(el).getAttribute('style')).toContain('justify-content: center');
    }
    const plain = await mount({ isGlassy: true, config: {} as never });
    expect(logo(plain).getAttribute('style')).toContain('justify-content: flex-start');
    expect(text(plain).getAttribute('style')).toContain('text-align: left');
  });

  it('only sets a font-size variable when a size is configured, in pixels for numbers', async () => {
    const none = await mount({ config: {} as never });
    expect(none.shadowRoot!.querySelector('.welcome-title')!.getAttribute('style')).not.toContain('--cw-welcome-title-size');
    const sized = await mount({ config: { titleFontSize: 22, descriptionFontSize: '0.9rem' } as never });
    expect(sized.shadowRoot!.querySelector('.welcome-title')!.getAttribute('style')).toContain('--cw-welcome-title-size: 22px;');
    expect(sized.shadowRoot!.querySelector('.welcome-desc')!.getAttribute('style')).toContain('--cw-welcome-desc-size: 0.9rem;');
  });

  it('shows the logo image or the default icon, in both layouts, and can hide it', async () => {
    const withImage = await mount({ config: { logoUrl: 'http://l/x.png', logoAlt: 'Acme' } as never });
    expect(withImage.shadowRoot!.querySelector('img.logo-img')!.getAttribute('alt')).toBe('Acme');
    const fallbackIcon = await mount({ config: {} as never });
    expect(fallbackIcon.shadowRoot!.querySelector('cw-icon')).not.toBeNull();
    expect(fallbackIcon.shadowRoot!.querySelector('img.logo-img')).toBeNull();

    const logoOnly = await mount({ logoOnly: true, config: { logoUrl: 'http://l/x.png' } as never });
    expect(logoOnly.shadowRoot!.querySelector('.text-block')).toBeNull();
    expect(logoOnly.shadowRoot!.querySelector('img.logo-img')!.getAttribute('alt')).toBe('Company Logo');

    const hidden = await mount({ hideLogo: true, config: {} as never });
    expect(hidden.shadowRoot!.querySelector('.logo-container')).toBeNull();
    expect(hidden.shadowRoot!.querySelector('.text-block')).not.toBeNull();
  });

  it('stacks avatars with a negative overlap, naming each one', async () => {
    const el = await mount({
      config: { avatars: ['http://a/1.png', { url: 'http://a/2.png', name: 'Mia' }, {}], avatarBorderColor: 'red' } as never
    });
    const avatars = Array.from(el.shadowRoot!.querySelectorAll('cw-avatar')) as any[];
    expect(avatars).toHaveLength(3);
    expect(avatars.map((a) => a.name)).toEqual(['Agent', 'Mia', 'Agent']);
    expect(avatars.map((a) => a.src)).toEqual(['http://a/1.png', 'http://a/2.png', '']);
    expect(avatars[0].getAttribute('style')).toContain('margin-left: 0');
    expect(avatars[1].getAttribute('style')).toContain('margin-left: -10px');
    expect(avatars[2].getAttribute('style')).toContain('z-index: 12');
    expect(avatars[0].getAttribute('style')).toContain('border: 2px solid red');
  });
});
