import { describe, it, expect } from 'vitest';
import { CHATBAR_BAR_PRESET, CHATBAR_CARD_PRESET } from '../../config/chatbar-presets.js';

describe('tokens/chatbar-presets.ts', () => {
  it('should define valid CHATBAR_BAR_PRESET configuration', () => {
    expect(CHATBAR_BAR_PRESET).toBeDefined();
    expect(CHATBAR_BAR_PRESET.layout).toBe('bar');
    expect(CHATBAR_BAR_PRESET.enabled).toBe(true);
  });

  it('should define valid CHATBAR_CARD_PRESET configuration', () => {
    expect(CHATBAR_CARD_PRESET).toBeDefined();
    expect(CHATBAR_CARD_PRESET.layout).toBe('card');
    expect(CHATBAR_CARD_PRESET.enabled).toBe(true);
  });
});
