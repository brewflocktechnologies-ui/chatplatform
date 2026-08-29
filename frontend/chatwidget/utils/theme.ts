/**
 * utils/theme.ts
 * Port of window.ZotlyUtils from utils.js
 */

/**
 * Reads --primary-color and --secondary-color CSS variables from the host page,
 * falling back to the data-accent attribute on the widget script tag.
 */
export function getParentTheme(): { primary: string; secondary: string } {
  if (typeof getComputedStyle === 'undefined') {
    return { primary: '#0b5fff', secondary: '#0b5fff' };
  }
  const rootStyle = getComputedStyle(document.documentElement);
  const bodyStyle = getComputedStyle(document.body);

  let primary =
    rootStyle.getPropertyValue('--primary-color').trim() ||
    bodyStyle.getPropertyValue('--primary-color').trim();
  let secondary =
    rootStyle.getPropertyValue('--secondary-color').trim() ||
    bodyStyle.getPropertyValue('--secondary-color').trim();

  // Fall back to data-accent on the widget script tag
  const scriptTag =
    document.querySelector<HTMLScriptElement>('script[data-client-id]') ||
    document.querySelector<HTMLScriptElement>('script[src*="index.es.js"]') ||
    document.querySelector<HTMLScriptElement>('script[src*="index.js"]') ||
    document.querySelector<HTMLScriptElement>('script[src*="chat-widget.js"]') ||
    document.querySelector<HTMLScriptElement>('script[src*="widget.js"]');
  const dataAccent = scriptTag ? scriptTag.getAttribute('data-accent') : null;

  if (!primary && dataAccent) primary = dataAccent;
  if (!primary) primary = '#0b5fff';
  if (!secondary) secondary = primary;

  return { primary, secondary };
}

/**
 * Determines the base URL for the widget's assets (JSON configs, etc.)
 * by inspecting the loaded script's src.
 */
export function getWidgetBaseUrl(): string {
  const scriptTag =
    document.querySelector<HTMLScriptElement>('script[src*="index.es.js"]') ||
    document.querySelector<HTMLScriptElement>('script[src*="index.umd.js"]') ||
    document.querySelector<HTMLScriptElement>('script[src*="index.js"]') ||
    document.querySelector<HTMLScriptElement>('script[src*="widget.js"]');

  if (scriptTag && scriptTag.src) {
    try {
      const scriptUrl = new URL(scriptTag.src, window.location.href);
      if (scriptUrl.pathname.includes('/dist/')) {
        return new URL('../', scriptUrl).href;
      }
      return new URL('./', scriptUrl).href;
    } catch (_) {
      /* ignore */
    }
  }

  if (window.location.pathname.includes('/chatwidget_components_lit/')) {
    return './';
  }
  return './chatwidget_components_lit/';
}

/**
 * Returns true when the host page currently has the dark class on <html>.
 */
export function isHostDark(): boolean {
  return document.documentElement.classList.contains('dark');
}

/**
 * Observes the host page's <html> class changes and fires a callback
 * whenever dark mode toggles. Returns an unsubscribe function.
 */
export function observeDarkMode(callback: (isDark: boolean) => void): () => void {
  const observer = new MutationObserver(() => callback(isHostDark()));
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
  return () => observer.disconnect();
}
