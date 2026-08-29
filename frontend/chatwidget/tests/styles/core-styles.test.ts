import { describe, it, expect } from 'vitest';
import { CORE_STYLES } from '../../styles/core-styles.js';

describe('tokens/core-styles.ts', () => {
  it('exports CORE_STYLES stylesheet', () => {
    expect(CORE_STYLES).toBeDefined();
    expect(CORE_STYLES.cssText).toContain('@layer base');
  });
});
