import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getParentTheme, getWidgetBaseUrl, isHostDark, observeDarkMode } from '../../utils/theme.js';

describe('utils/theme.ts', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    document.body.innerHTML = '';
  });

  it('should return default primary and secondary colors when none set on document', () => {
    const theme = getParentTheme();
    expect(theme.primary).toBe('#0b5fff');
    expect(theme.secondary).toBe('#0b5fff');
  });

  it('should read --primary-color and --secondary-color from CSS variables', () => {
    document.documentElement.style.setProperty('--primary-color', '#ff0000');
    document.documentElement.style.setProperty('--secondary-color', '#00ff00');

    const theme = getParentTheme();
    expect(theme.primary).toBe('#ff0000');
    expect(theme.secondary).toBe('#00ff00');

    document.documentElement.style.removeProperty('--primary-color');
    document.documentElement.style.removeProperty('--secondary-color');
  });

  it('should read data-accent attribute from script tag if available', () => {
    const script = document.createElement('script');
    script.setAttribute('data-client-id', 'test');
    script.setAttribute('data-accent', '#10b981');
    document.body.appendChild(script);

    const theme = getParentTheme();
    expect(theme.primary).toBe('#10b981');
  });

  it('should detect dark mode on <html> tag', () => {
    expect(isHostDark()).toBe(false);
    document.documentElement.classList.add('dark');
    expect(isHostDark()).toBe(true);
  });

  it('should notify callback when dark mode toggles', async () => {
    const spy = vi.fn();
    const unsubscribe = observeDarkMode(spy);

    document.documentElement.classList.add('dark');

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(spy).toHaveBeenCalledWith(true);
    unsubscribe();
  });

  it('returns widget base url depending on script tag src or pathname', () => {
    const script = document.createElement('script');
    script.type = 'text/plain';
    script.setAttribute('src', 'http://localhost/dist/index.js');
    document.body.appendChild(script);

    const url = getWidgetBaseUrl();
    expect(url).toContain('http://localhost/');

    script.setAttribute('src', 'http://localhost/index.js');
    const url2 = getWidgetBaseUrl();
    expect(url2).toBe('http://localhost/');

    script.remove();

    delete (window as any).location;
    (window as any).location = new URL('http://localhost/chatwidget_components_lit/index.html');
    const baseLit = getWidgetBaseUrl();
    expect(baseLit).toBe('./');

    (window as any).location = new URL('http://localhost/other_page.html');
    const baseOther = getWidgetBaseUrl();
    expect(baseOther).toBe('./chatwidget_components_lit/');
  });

  it('handles getComputedStyle undefined in getParentTheme', () => {
    const orig = window.getComputedStyle;
    (window as any).getComputedStyle = undefined;
    const res = getParentTheme();
    expect(res.primary).toBe('#0b5fff');
    window.getComputedStyle = orig;
  });
});
