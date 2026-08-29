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
