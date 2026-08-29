/**
 * Compiles a TokenTheme into --cw-* CSS custom property declarations.
 */

import { DEFAULT_TOKEN_THEME, type TokenTheme } from './default-theme.js';

/** camelCase/PascalCase kebab → `accentDeep` → `accent-deep`. Already-kebab keys are unchanged. */
function kebab(key: string): string {
  return key.includes('-') ? key : key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
}

/** `{ accentDeep }` with prefix `--cw-` → `{ '--cw-accent-deep': ... }`. */
function prefixVars(obj: Record<string, string>, prefix: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) out[prefix + kebab(k)] = v;
  return out;
}

/** Flatten a theme into `--cw-*` → value for the default (:root) map. */
export function themeToCssVars(theme: TokenTheme): Record<string, string> {
  return {
    ...prefixVars(theme.colors as unknown as Record<string, string>, '--cw-'),
    '--cw-grad': theme.grad,
    ...prefixVars(theme.status as unknown as Record<string, string>, '--cw-'),
    ...prefixVars(theme.typography as unknown as Record<string, string>, '--cw-font-'),
    ...prefixVars(theme.spacing as unknown as Record<string, string>, '--cw-'),
    ...prefixVars(theme.radius as unknown as Record<string, string>, '--cw-radius-'),
  };
}

/** Flatten the dark overrides into the flat --cw-* map that belongs in `.dark`. */
export function themeToDarkVars(theme: TokenTheme): Record<string, string> {
  const dark = theme.dark;
  if (!dark) return {};
  return {
    ...(dark.colors ? prefixVars(dark.colors as unknown as Record<string, string>, '--cw-') : {}),
    ...(dark.status ? prefixVars(dark.status as unknown as Record<string, string>, '--cw-') : {}),
  };
}

function toCssDecl(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');
}

/** Compile a theme to a CSS string (`:root { ... }` + an optional `.dark { ... }`). */
export function themeToCss(theme: TokenTheme): string {
  const parts: string[] = [':root {\n' + toCssDecl(themeToCssVars(theme)) + '\n}'];
  const darkVars = themeToDarkVars(theme);
  if (Object.keys(darkVars).length > 0) {
    parts.push('\n.dark {\n' + toCssDecl(darkVars) + '\n}');
  }
  return parts.join('\n');
}

let injected = false;

/**
 * Injects the token CSS (`:root { --cw-* }` + `.dark { --cw-* }`) into the
 * document once, so every component's `var(--cw-*)` resolves via inheritance
 * (and dark mode flips with the host page's `.dark` class). No-op in
 * non-browser environments.
 */
export function ensureTokenCss(theme: TokenTheme = DEFAULT_TOKEN_THEME, doc?: Document): void {
  /* v8 ignore next -- the no-document fallback only runs in SSR contexts happy-dom can't simulate */
  const d = doc || (typeof document !== 'undefined' ? document : null);
  if (injected || !d || !d.head) return;
  if (d.getElementById('cw-token-css')) {
    injected = true;
    return;
  }
  const style = d.createElement('style');
  style.id = 'cw-token-css';
  style.textContent = themeToCss(theme);
  d.head.appendChild(style);
  injected = true;
}
