/**
 * Design Tokens for Zotly Chat Widget (Lit)
 * Maps all --cw-* CSS custom properties used in the Alpine widget.
 */

// NOTE: GLOBAL_STYLES (tokens/global-styles.ts, ~76 KB) is intentionally NOT
// re-exported here. Components style themselves from CORE_STYLES
// (tokens/core-styles.ts), which is the slimmed subset. Re-exporting the full
// blob from the package entry pinned it as a public export, so Rollup could not
// tree-shake it and every visitor downloaded the unused dashboard CSS.

// ---------------------------------------------------------------------------
// CSS Variable Name Constants
// ---------------------------------------------------------------------------
export const CW_BG = '--cw-bg';
export const CW_SURFACE = '--cw-surface';
export const CW_BORDER = '--cw-border';
export const CW_INK = '--cw-ink';
export const CW_MUTED = '--cw-muted';
export const CW_GRAD = '--cw-grad';
export const CW_ACCENT = '--cw-accent';
export const CW_ACCENT_TINT = '--cw-accent-tint';
export const CW_ACCENT_DEEP = '--cw-accent-deep';
export const CW_ACCENT_SOFT = '--cw-accent-soft';

// Expanded Semantic Token Constants (Backwards Compatible)
export const CW_FONT_FAMILY = '--cw-font-family';
export const CW_FONT_SIZE_XS = '--cw-font-size-xs';
export const CW_FONT_SIZE_SM = '--cw-font-size-sm';
export const CW_FONT_SIZE_MD = '--cw-font-size-md';
export const CW_FONT_SIZE_LG = '--cw-font-size-lg';
export const CW_FONT_SIZE_XL = '--cw-font-size-xl';
export const CW_FONT_SIZE_2XL = '--cw-font-size-2xl';

export const CW_SPACE_XS = '--cw-space-xs';
export const CW_SPACE_SM = '--cw-space-sm';
export const CW_SPACE_MD = '--cw-space-md';
export const CW_SPACE_LG = '--cw-space-lg';

export const CW_RADIUS_SM = '--cw-radius-sm';
export const CW_RADIUS_MD = '--cw-radius-md';
export const CW_RADIUS_LG = '--cw-radius-lg';
export const CW_RADIUS_FULL = '--cw-radius-full';

export const CW_SUCCESS = '--cw-success';
export const CW_WARNING = '--cw-warning';
export const CW_ERROR = '--cw-error';
export const CW_FOCUS_RING = '--cw-focus-ring';

import { DEFAULT_TOKEN_THEME } from './default-theme.js';
import { themeToCssVars, themeToDarkVars } from './css.js';

// ---------------------------------------------------------------------------
// Token Default Values (Derived from DEFAULT_TOKEN_THEME in default-theme.ts)
// ---------------------------------------------------------------------------
export const LIGHT_TOKENS: Record<string, string> = themeToCssVars(DEFAULT_TOKEN_THEME);

export const DARK_TOKENS: Record<string, string> = {
  ...LIGHT_TOKENS,
  ...themeToDarkVars(DEFAULT_TOKEN_THEME),
};

// ---------------------------------------------------------------------------
// Keyframe & animation CSS injected into Shadow DOM styles
// ---------------------------------------------------------------------------
export const KEYFRAMES_CSS = `
  #zotly-widget-embed, #zotly-widget-embed *, .panel, .panel * {
    font-family: inherit !important;
  }
  @keyframes statusPulse {
    0% { transform: scale(0.9); opacity: 0.65; }
    50% { transform: scale(1.6); opacity: 0.3; }
    100% { transform: scale(2.4); opacity: 0; }
  }
  @keyframes zotly-wiggle {
    0%, 100% { transform: rotate(0deg); }
    15% { transform: rotate(-8deg); }
    30% { transform: rotate(6deg); }
    45% { transform: rotate(-4deg); }
    60% { transform: rotate(3deg); }
    75% { transform: rotate(-1deg); }
  }
  @keyframes zotly-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.08); }
  }
  @keyframes zotly-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }
  @keyframes zotly-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }
  @keyframes zotly-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes popIn {
    0% { transform: scale(.9); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes slideUp {
    from { transform: translateY(16px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes dotBounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }
  @keyframes dotPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.25); }
  }
  @keyframes typingBounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-4px); opacity: 1; }
  }
  .anim-zotly-wiggle { animation: zotly-wiggle 2.5s infinite ease-in-out; }
  .anim-zotly-pulse { animation: zotly-pulse 2s infinite ease-in-out; }
  .anim-zotly-bounce { animation: zotly-bounce 2s infinite ease-in-out; }
  .anim-zotly-float { animation: zotly-float 3s infinite ease-in-out; }
  .anim-zotly-spin { animation: zotly-spin 4s infinite linear; }
`;

export function tokensToCss(tokens: Record<string, string>): string {
  return Object.entries(tokens)
    .map(([k, v]) => `${k}: ${v};`)
    .join('\n  ');
}

export function hostTokensCss(isDark = false): string {
  const tokens = isDark ? DARK_TOKENS : LIGHT_TOKENS;
  return `:host { ${tokensToCss(tokens)} }`;
}
