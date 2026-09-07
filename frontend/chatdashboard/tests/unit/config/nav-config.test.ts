import { describe, expect, it } from 'vitest';
import { navGroups } from '@/config/nav-config';
import { Icons } from '@/components/icons';

describe('navGroups', () => {
  const allItems = navGroups.flatMap((group) => group.items);

  it('defines at least one group with items', () => {
    expect(navGroups.length).toBeGreaterThan(0);
    for (const group of navGroups) {
      expect(group.items.length).toBeGreaterThan(0);
    }
  });

  it('gives every item a title and a /dashboard url', () => {
    for (const item of allItems) {
      expect(item.title).toBeTruthy();
      expect(item.url).toMatch(/^\/dashboard(\/|$)/);
    }
  });

  it('has no duplicate titles or urls', () => {
    const titles = allItems.map((item) => item.title);
    const urls = allItems.map((item) => item.url);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('references only icons that exist in the Icons registry', () => {
    for (const item of allItems) {
      if (item.icon) {
        expect(Icons[item.icon], `icon "${item.icon}" for "${item.title}"`).toBeDefined();
      }
    }
  });

  it('uses two-key sequences for every shortcut', () => {
    for (const item of allItems) {
      if (item.shortcut) {
        expect(item.shortcut).toHaveLength(2);
        for (const key of item.shortcut) {
          expect(key).toMatch(/^[a-z]$/);
        }
      }
    }
  });

  it('kbar action ids derived from titles stay unique', () => {
    // KBar builds ids as `${title.toLowerCase()}Action` — collisions would
    // silently drop palette entries.
    const ids = allItems.map((item) => `${item.title.toLowerCase()}Action`);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
