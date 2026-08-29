import { describe, it, expect } from 'vitest';
import { GLOBAL_STYLES } from '../../styles/global-styles.js';

describe('global-styles token', () => {
  it('exports GLOBAL_STYLES CSSResult object', () => {
    expect(GLOBAL_STYLES).toBeDefined();
    expect(GLOBAL_STYLES.cssText).toBeDefined();
    expect(typeof GLOBAL_STYLES.cssText).toBe('string');
  });
});
