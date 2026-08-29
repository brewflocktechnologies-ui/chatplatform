import { describe, it, expect, vi } from 'vitest';

describe('tokens/css.ts', () => {
  it('converts theme to CSS variables', async () => {
    const { themeToCssVars } = await import('../../tokens/css.js');
    const { DEFAULT_TOKEN_THEME } = await import('../../tokens/default-theme.js');
    const vars = themeToCssVars(DEFAULT_TOKEN_THEME);
    expect(vars['--cw-grad']).toBeDefined();
    expect(vars['--cw-font-family']).toBeDefined();
  });

  it('converts dark theme overrides to CSS variables', async () => {
    const { themeToDarkVars } = await import('../../tokens/css.js');
    const { DEFAULT_TOKEN_THEME } = await import('../../tokens/default-theme.js');
    const darkVars = themeToDarkVars(DEFAULT_TOKEN_THEME);
    expect(darkVars).toBeDefined();

    const noDarkTheme = { ...DEFAULT_TOKEN_THEME, dark: undefined };
    expect(themeToDarkVars(noDarkTheme as any)).toEqual({});
  });

  it('compiles theme to full CSS string', async () => {
    const { themeToCss } = await import('../../tokens/css.js');
    const { DEFAULT_TOKEN_THEME } = await import('../../tokens/default-theme.js');
    const css = themeToCss(DEFAULT_TOKEN_THEME);
    expect(css).toContain(':root {');
    expect(css).toContain('.dark {');
  });

  it('handles existing style element in ensureTokenCss', async () => {
    vi.resetModules();
    const { ensureTokenCss } = await import('../../tokens/css.js');
    const { DEFAULT_TOKEN_THEME } = await import('../../tokens/default-theme.js');

    const customDoc = document.implementation.createHTMLDocument('test');
    const existing = customDoc.createElement('style');
    existing.id = 'cw-token-css';
    customDoc.head.appendChild(existing);

    ensureTokenCss(DEFAULT_TOKEN_THEME, customDoc);
    expect(customDoc.getElementById('cw-token-css')).toBe(existing);
  });

  it('injects style element into document head', async () => {
    vi.resetModules();
    const { ensureTokenCss } = await import('../../tokens/css.js');
    const { DEFAULT_TOKEN_THEME } = await import('../../tokens/default-theme.js');

    ensureTokenCss(DEFAULT_TOKEN_THEME);
    expect(document.getElementById('cw-token-css')).not.toBeNull();

    // Calling again should be a no-op
    ensureTokenCss(DEFAULT_TOKEN_THEME);
  });

  it('handles null or invalid document in ensureTokenCss', async () => {
    const { ensureTokenCss, themeToDarkVars, themeToCss } = await import('../../tokens/css.js');
    const { DEFAULT_TOKEN_THEME } = await import('../../tokens/default-theme.js');

    expect(themeToDarkVars({ ...DEFAULT_TOKEN_THEME, dark: {} as any })).toEqual({});
    expect(themeToCss({ ...DEFAULT_TOKEN_THEME, dark: undefined } as any)).not.toContain('.dark {');

    vi.resetModules();
    const mod = await import('../../tokens/css.js');
    mod.ensureTokenCss(DEFAULT_TOKEN_THEME, { head: null, getElementById: () => null } as any);
    mod.ensureTokenCss(DEFAULT_TOKEN_THEME);
  });
});
