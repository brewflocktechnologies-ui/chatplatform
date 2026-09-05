// ============================================================
// External URLs & MFE Environment Configuration
// ============================================================
// Switch between 'local' and 'prod' as per your wish:
// 1. By changing ACTIVE_WIDGET_ENV below ('local' | 'prod')
// 2. Or setting NEXT_PUBLIC_WIDGET_CUSTOMIZATION_ENV in .env.local ('local' | 'prod')
// 3. Or setting NEXT_PUBLIC_WIDGET_CUSTOMIZATION_URL to a custom URL
// 4. Or toggling via browser localStorage: localStorage.setItem('widget_env', 'prod' | 'local')
// ============================================================

export type WidgetEnv = 'local' | 'prod';

/**
 * Default environment for widget assets & customization MFE.
 * - 'prod': Loads from GitHub Pages CDN (works out-of-the-box without running port 5001).
 * - 'local': Loads from local vite preview (chatwidget-customization on port 5001, chatwidget on port 4173).
 */
export const ACTIVE_WIDGET_ENV: WidgetEnv = 'prod';

export const WIDGET_ENDPOINTS = {
  customizationMfe: {
    local: 'http://localhost:5001',
    prod: 'https://brewflocktechnologies-ui.github.io/chatplatform/chatwidget-customization'
  },
  chatWidget: {
    local: 'http://localhost:4173/chat-widget.js',
    prod: 'https://brewflocktechnologies-ui.github.io/chatplatform/chatwidget/dist/chat-widget.js'
  },
  deployRoot: {
    local: 'http://localhost:5001',
    prod: 'https://brewflocktechnologies-ui.github.io/chatplatform'
  }
} as const;

export const EXTERNAL_URLS = {
  chatWidgetCdn: WIDGET_ENDPOINTS.chatWidget.prod,
  widgetDeployRoot: WIDGET_ENDPOINTS.deployRoot.prod
};

/**
 * Resolves the active environment ('local' | 'prod') based on:
 * 1. window.localStorage ('widget_env')
 * 2. process.env.NEXT_PUBLIC_WIDGET_CUSTOMIZATION_ENV
 * 3. ACTIVE_WIDGET_ENV constant above
 */
export function getActiveWidgetEnv(): WidgetEnv {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem('widget_env') as WidgetEnv | null;
    if (stored === 'local' || stored === 'prod') {
      return stored;
    }
  }

  const envVar = process.env.NEXT_PUBLIC_WIDGET_CUSTOMIZATION_ENV as WidgetEnv | undefined;
  if (envVar === 'local' || envVar === 'prod') {
    return envVar;
  }

  return ACTIVE_WIDGET_ENV;
}

/**
 * Set the environment at runtime from the browser.
 */
export function setActiveWidgetEnv(env: WidgetEnv): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('widget_env', env);
  }
}

/**
 * Widget customization micro-frontend URL (remoteEntry.js location).
 */
export function getWidgetCustomizationMfeUrl(): string {
  if (process.env.NEXT_PUBLIC_WIDGET_CUSTOMIZATION_URL) {
    return process.env.NEXT_PUBLIC_WIDGET_CUSTOMIZATION_URL;
  }

  const env = getActiveWidgetEnv();
  return WIDGET_ENDPOINTS.customizationMfe[env];
}

/**
 * Chat widget bundle URL.
 */
export function getChatWidgetUrl(): string {
  if (process.env.NEXT_PUBLIC_CHAT_WIDGET_URL) {
    return process.env.NEXT_PUBLIC_CHAT_WIDGET_URL;
  }

  const env = getActiveWidgetEnv();
  return WIDGET_ENDPOINTS.chatWidget[env];
}

export function buildEmbedCode(websiteId: string): string {
  return [
    '<!-- BrewFlock Chat Widget -->',
    `<script defer src="${EXTERNAL_URLS.widgetDeployRoot}/widget-loader.js" data-website-id="${websiteId}"></script>`
  ].join('\n');
}

