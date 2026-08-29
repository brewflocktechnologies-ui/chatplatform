/**
 * Main Entry Point for Chat Widget Components (Lit)
 * Exports all tokens, utils, store, and automatically registers custom web components.
 */

export * from './tokens/design-tokens.js';
export * from './styles/core-styles.js';
// NOTE: styles/global-styles.ts (~76 KB, unused dashboard CSS) is intentionally
// NOT re-exported here. Re-exporting it from the package entry pins it as a
// public export, so Rollup can't tree-shake it and every visitor downloads it.
export * from './tokens/accessibility.js';
export * from './tokens/default-theme.js';
export * from './tokens/merge.js';
export * from './tokens/css.js';
export * from './config/chatbar-presets.js';
export * from './config/form-schemas.js';
export * from './config/widget-config.js';
export * from './utils/theme.js';
export * from './utils/config.js';
export * from './utils/transition.js';
export * from './utils/dismiss.js';
export {
  hexToRgba,
  getBorderRadius,
  getGradient,
  getBoxShadow,
  getInnerShadow,
  getCompositeBackground,
  getChatbarBackground,
  getChatbarFontSize,
  getChatbarIconWidth,
  getChatbarIconHeight,
  getTooltipBorderRadius,
  getAnimClass,
  formatTime
} from './utils/style-helpers.js';
export * from './store/chat-store.js';
import { injectStoreConfig } from './store/chat-store.js';

// Atoms
export * from './components/atoms/cw-icon.js';
export * from './components/atoms/cw-badge.js';
export * from './components/atoms/cw-typing-dots.js';
export * from './components/atoms/cw-status-dot.js';
export * from './components/atoms/cw-tooltip.js';
export * from './components/atoms/cw-button.js';
export * from './components/atoms/cw-menu-item.js';

// Molecules
export * from './components/molecules/cw-avatar.js';
export * from './components/molecules/cw-form-field.js';
export * from './components/molecules/cw-message-bubble.js';
export * from './components/molecules/cw-composer.js';
export * from './components/molecules/cw-greet-input.js';
export * from './components/molecules/cw-chat-footer.js';
export * from './components/molecules/cw-emoji-picker.js';
export * from './components/molecules/cw-attach-menu.js';
export * from './components/molecules/cw-chat-menu.js';
export * from './components/molecules/cw-confirm-dialog.js';

// Organisms

export * from './components/organisms/cw-bubble.js';
export * from './components/organisms/cw-chatbar.js';
export * from './components/organisms/cw-greet-window.js';
export * from './components/organisms/cw-chat-header.js';
export * from './components/organisms/cw-welcome-card.js';
export * from './components/organisms/cw-chat-form.js';
export * from './components/organisms/cw-image-cropper.js';
export * from './components/organisms/cw-chat-body.js';
export * from './components/organisms/cw-chat-panel.js';

// Templates
export * from './components/templates/cw-widget-layout.js';

// Pages
export * from './components/pages/cw-widget-root.js';

// Auto-mount function helper for script tag usage
export function mountChatWidget(container: HTMLElement = document.body): HTMLElement {
  let root = container.querySelector<HTMLElement>('cw-widget-root');
  if (!root) {
    root = document.createElement('cw-widget-root');
    container.appendChild(root);
  }
  return root;
}

/**
 * Mounts the widget into container and hydrates the store using the provided JSON token.
 */
export function mountChatWidgetWithToken(
  token: Record<string, any>,
  container: HTMLElement = document.body
): HTMLElement {
  if (token) {
    injectStoreConfig(token);
  }
  return mountChatWidget(container);
}

if (typeof window !== 'undefined') {
  const mount = () => {
    mountChatWidget();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
}

