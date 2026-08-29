import { describe, it, expect } from 'vitest';
import {
  CW_ACCENT,
  CW_BG,
  LIGHT_TOKENS,
  DARK_TOKENS,
  tokensToCss,
  hostTokensCss,
  KEYFRAMES_CSS,
} from '../../tokens/design-tokens.js';

describe('tokens/design-tokens.ts', () => {
  it('should export CSS variable name constants', () => {
    expect(CW_ACCENT).toBe('--cw-accent');
    expect(CW_BG).toBe('--cw-bg');
  });

  it('should export valid LIGHT_TOKENS map', () => {
    expect(LIGHT_TOKENS[CW_ACCENT]).toBe('#0b5fff');
    expect(LIGHT_TOKENS[CW_BG]).toBe('#f6f7fa');
  });

  it('should export valid DARK_TOKENS map', () => {
    expect(DARK_TOKENS[CW_ACCENT]).toBe('#0b5fff');
    expect(DARK_TOKENS[CW_BG]).toBe('#0f172a');
  });

  it('formats tokens map into CSS declarations via tokensToCss', () => {
    const css = tokensToCss({ '--cw-test': '10px' });
    expect(css).toBe('--cw-test: 10px;');
  });

  it('generates host tokens CSS for light and dark modes via hostTokensCss', () => {
    const lightCss = hostTokensCss(false);
    expect(lightCss).toContain(':host {');
    expect(lightCss).toContain('#f6f7fa');

    const darkCss = hostTokensCss(true);
    expect(darkCss).toContain(':host {');
    expect(darkCss).toContain('#0f172a');
  });

  it('exports KEYFRAMES_CSS string', () => {
    expect(KEYFRAMES_CSS).toBeDefined();
    expect(KEYFRAMES_CSS).toContain('@keyframes');
  });
});
