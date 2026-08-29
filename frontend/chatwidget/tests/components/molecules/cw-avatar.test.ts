import { describe, it, expect, beforeEach } from 'vitest';
import '../../../components/molecules/cw-avatar.js';
import { CwAvatar } from '../../../components/molecules/cw-avatar.js';

describe('CwAvatar Molecule Component', () => {
  let element: CwAvatar;

  beforeEach(async () => {
    document.body.innerHTML = '';
    element = new CwAvatar();
    document.body.appendChild(element);
    await element.updateComplete;
  });

  it('should instantiate and mount cw-avatar element', () => {
    expect(element).toBeDefined();
    expect(element.tagName.toLowerCase()).toBe('cw-avatar');
  });

  it('should render initial letter when imageUrl is empty', async () => {
    element.name = 'Sarah';
    await element.updateComplete;

    const span = element.shadowRoot?.querySelector('.avatar-box span');
    expect(span?.textContent?.trim()).toBe('S');
  });

  it('handles fallback name, bgColor, textColor and activeDot customization', async () => {
    element.name = '' as any;
    element.bgColor = '#123456';
    element.textColor = '#654321';
    element.activeDot = { size: 10, color: '#ff0000', animate: false, borderWidth: 1, borderColor: '#000000' };
    await element.updateComplete;

    const span = element.shadowRoot?.querySelector('.avatar-box span');
    expect(span?.textContent?.trim()).toBe('S');

    let box = element.shadowRoot?.querySelector('.avatar-box') as HTMLElement;
    expect(box.getAttribute('style')).toContain('#123456');

    // Empty bg and color fallback
    element.bgColor = '';
    element.bg = '';
    element.textColor = '';
    element.color = '';
    await element.updateComplete;
    box = element.shadowRoot?.querySelector('.avatar-box') as HTMLElement;
    expect(box.getAttribute('style')).toContain('rgba(255,255,255,0.2)');
  });

  it('should render image element when src or imageUrl is provided', async () => {
    element.name = 'Sarah';
    element.imageUrl = 'https://example.com/avatar.jpg';
    await element.updateComplete;

    const img = element.shadowRoot?.querySelector('img.avatar-img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('https://example.com/avatar.jpg');
  });

  it('should render online status dot when showOnlineDot is true and hide when false', async () => {
    element.showOnlineDot = true;
    element.showOnline = true;
    await element.updateComplete;

    let dot = element.shadowRoot?.querySelector('cw-status-dot');
    expect(dot).not.toBeNull();

    element.showOnlineDot = false;
    await element.updateComplete;
    dot = element.shadowRoot?.querySelector('cw-status-dot');
    expect(dot).toBeNull();
  });
});
