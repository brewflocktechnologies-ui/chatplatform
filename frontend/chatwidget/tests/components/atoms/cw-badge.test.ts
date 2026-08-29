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
