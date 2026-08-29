import html from '../index.html?raw';
import appStyles from '../styles.css?inline';
import litStyles from '../../chatwidget/public/style.css?inline';
import coreSource from './core.js?raw';
import scriptsSource from '../scripts.js?raw';

// ── WIDGET HOST — resolved automatically for both environments:
// • local (localhost / 127.0.0.1): the chatwidget vite preview on port 4173
//   (frontend/chatwidget: npm run preview). Change the port below if the
//   widget preview runs elsewhere.
// • deployed: the widget bundle sits in this remote's own dist/ folder
//   (copied there by .github/workflows/deploy.yml), resolved relative to
//   this module — no edits needed when deploying.
const REMOTE_HOSTNAME = new URL(import.meta.url).hostname;
const CHAT_WIDGET_HOST =
  REMOTE_HOSTNAME === 'localhost' || REMOTE_HOSTNAME === '127.0.0.1'
    ? 'http://localhost:4173'
    : new URL('../dist', import.meta.url).href;

// Origin this remote is served from (e.g. http://localhost:5001). Used so
// preset/config fetches resolve against the remote, not the host page origin.
const REMOTE_ORIGIN = new URL(import.meta.url).origin;

const CDN = {
  fonts:
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;600;700;800&family=Fira+Code:wght@400;500&display=swap',
  tailwind: 'https://cdn.tailwindcss.com',
  lucide: 'https://unpkg.com/lucide@latest',
  alpine: 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js',
  chatWidget: `${CHAT_WIDGET_HOST}/chat-widget.js`,
};

function runInFrameClassic(doc, code) {
  const s = doc.createElement('script');
  s.textContent = code;
  doc.head.appendChild(s);
}

/**
 * Mounts the full customization UI into `el`, entirely inside an <iframe>.
 *
 * Everything (project CSS, Tailwind Preflight, Alpine, fonts, lucide, the chat
 * widget, scripts.js) runs in the iframe's own document, so nothing leaks into
 * or overrides the host Next.js page (this fixes the sidebar's active button
 * background turning transparent). The iframe is built from a single srcdoc
 * document and scripts.js is executed exactly once on `load`, which avoids the
 * double-evaluation race that happens when mount() is async under React's
 * StrictMode (otherwise `const MSG_LABELS` etc. throw "already declared").
 */
export async function mount(el, options = {}) {
  if (!el || el.dataset.cwMounted === 'true') return;
  el.dataset.cwMounted = 'true';

  // Parse the FULL document and rebuild only the <head> with our inlined CSS
  // and CDN deps. The <html>/<body> elements (especially the body's
  // `chatwidget-customization-app` class, which carries the CSS variables and
  // `height:100vh; overflow:hidden`) MUST be preserved, otherwise the layout
  // falls back to natural document height and the page scrolls slightly.
  const doc = new DOMParser().parseFromString(html, 'text/html');

  doc.head.innerHTML = `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Widget Customization</title>
    <style>${litStyles}</style>
    <style>${appStyles}</style>
    <link rel="stylesheet" href="${CDN.fonts}">
    <script>window.tailwind = window.tailwind || {}; window.tailwind.config = { darkMode: 'class', theme: { extend: { colors: { primary: '#0b5fff' } } } };</script>
    <script src="${CDN.tailwind}"></script>
    <script src="${CDN.lucide}"></script>
    <script defer src="${CDN.chatWidget}"></script>
    <script defer src="${CDN.alpine}"></script>
  `;

  const frameHtml = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;

  const iframe = document.createElement('iframe');
  iframe.className = 'cw-customization-frame';
  iframe.setAttribute('title', 'Widget Customization');
  
  const isHostDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
  iframe.style.cssText = `width:100%;height:100%;border:0;display:block;background:${isHostDark ? '#000000' : '#fff'};`;

  const syncDarkMode = () => {
    const isDark = document.documentElement.classList.contains('dark') || 
                   document.body.classList.contains('dark') ||
                   el.classList.contains('dark');
    iframe.style.background = isDark ? '#000000' : '#fff';
    try {
      const doc = iframe.contentDocument;
      const win = iframe.contentWindow;
      if (doc && doc.documentElement) {
        if (isDark) {
          doc.documentElement.classList.add('dark');
          doc.body.classList.add('dark', 'dark-mode');
        } else {
          doc.documentElement.classList.remove('dark');
          doc.body.classList.remove('dark', 'dark-mode');
        }
      }
      if (win && win.ChatWidgetLit && win.ChatWidgetLit.chatStore) {
        win.ChatWidgetLit.chatStore.get().darkMode = isDark;
      }
      if (win && typeof win.updateAlpineStores === 'function' && win.cutomizationConfig) {
        win.updateAlpineStores(win.cutomizationConfig);
      }
    } catch (e) {
      /* cross-origin catch safety */
    }
  };

  iframe.onload = () => {
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win || win.__CW_INITIALIZED__) return;
    win.__CW_INITIALIZED__ = true;
    win.__CUSTOMIZATION_ASSET_BASE__ = `${REMOTE_ORIGIN}/`;
    win.__CW_OPTIONS__ = options;

    if (options && options.cdnConfig) {
      win.cutomizationConfig = options.cdnConfig;
    }

    try {
      win.lucide && win.lucide.createIcons();
    } catch (e) {
      /* non-fatal */
    }

    // Apply dark mode to iframe document as soon as loaded
    syncDarkMode();

    // Cross-frame messaging trust: the mount iframe only ever talks to the
    // page that embeds it, so pin the allowlist to the host's own origin.
    win.CW_TRUSTED_ORIGINS = [window.location.origin];

    // scripts.js runs as a classic script so its top-level functions
    // (triggerNotifPreviewUpdate, updateNotifCounter, etc.) are global on the
    // iframe window and the markup's inline handlers can find them.
    // core.js (CWCore: messaging policy, config validation, escaping) must be
    // evaluated first — scripts.js fails closed without it.
    runInFrameClassic(doc, coreSource);
    runInFrameClassic(doc, scriptsSource);
  };

  // Observe host document (Next.js <html> or <body>) for dark mode class updates
  if (window.MutationObserver) {
    const observer = new MutationObserver(syncDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    el._cwDarkObserver = observer;
  }

  iframe.srcdoc = frameHtml;
  el.appendChild(iframe);
}

export function unmount(el) {
  if (!el) return;
  if (el._cwDarkObserver) {
    el._cwDarkObserver.disconnect();
    delete el._cwDarkObserver;
  }
  el.innerHTML = '';
  delete el.dataset.cwMounted;
}
