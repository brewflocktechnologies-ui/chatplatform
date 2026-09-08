import { describe, expect, it } from 'vitest';
import { Icons } from '@/components/icons';

describe('Icons registry', () => {
  it('provides the logo fallback used by the sidebar', () => {
    expect(Icons.logo).toBeDefined();
  });

  it('provides every icon the nav config relies on', () => {
    const navIcons = [
      'dashboard',
      'workspace',
      'customers',
      'globe',
      'adjustments',
      'chat',
      'sparkles'
    ] as const;
    for (const name of navIcons) {
      expect(Icons[name], `Icons.${name}`).toBeDefined();
    }
  });

  it('provides the chrome icons used by sidebar and header', () => {
    const chromeIcons = [
      'chevronRight',
      'chevronsDown',
      'chevronsUpDown',
      'account',
      'creditCard',
      'notification',
      'logout',
      'search',
      'slash',
      'check',
      'add',
      'galleryVerticalEnd'
    ] as const;
    for (const name of chromeIcons) {
      expect(Icons[name], `Icons.${name}`).toBeDefined();
    }
  });

  it('exposes components (functions) for each registered icon', () => {
    for (const [name, component] of Object.entries(Icons)) {
      expect(
        typeof component === 'function' || typeof component === 'object',
        `Icons.${name} should be a renderable component`
      ).toBe(true);
    }
  });
});
