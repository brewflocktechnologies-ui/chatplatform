// ============================================================
// External URLs — hosted widget assets
// ============================================================
// Central place for the URLs the Websites feature embeds and previews.
// Update these when the widget is deployed to a different host.
// ============================================================

export const EXTERNAL_URLS = {
  // Hosted chat widget bundle (loaded by previews and client sites)
  chatWidgetCdn: 'https://brewflocktechnologies-ui.github.io/chatplatform/chatwidget/dist/chat-widget.js',
  // Deployment root used to build the embed snippet (widget-loader.js lives here)
  widgetDeployRoot: 'https://brewflocktechnologies-ui.github.io/chatplatform'
};

// Chat widget bundle. Local: the chatwidget vite preview on port 4173
// (frontend/chatwidget: npm run preview). Deployed: the hosted CDN bundle.
export function getChatWidgetUrl(): string {
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    return 'http://localhost:4173/chat-widget.js';
  }
  return EXTERNAL_URLS.chatWidgetCdn;
}

// Widget customization micro-frontend (module-federation remote exposing
// ./mount). Local: the chatwidget-customization vite preview on port 5001
// (frontend/chatwidget-customization: npm run preview). Deployed: the copy
// published under the widget deploy root by .github/workflows/deploy.yml.
export function getWidgetCustomizationMfeUrl(): string {
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    return 'http://localhost:5001';
  }
  return `${EXTERNAL_URLS.widgetDeployRoot}/chatwidget-customization`;
}

export function buildEmbedCode(websiteId: string): string {
  return [
    '<!-- BrewFlock Chat Widget -->',
    `<script defer src="${EXTERNAL_URLS.widgetDeployRoot}/widget-loader.js" data-website-id="${websiteId}"></script>`
  ].join('\n');
}
