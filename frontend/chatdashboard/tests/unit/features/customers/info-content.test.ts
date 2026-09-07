import { describe, it, expect } from 'vitest';
import { customersInfoContent } from '@/features/customers/info-content';

describe('customersInfoContent', () => {
  it('has a title and three sections', () => {
    expect(customersInfoContent.title).toBe('Customers — MongoDB + React Query');
    expect(customersInfoContent.sections).toHaveLength(3);
    expect(customersInfoContent.sections.map((s) => s.title)).toEqual([
      'Overview',
      'CRUD',
      'URL State with nuqs'
    ]);
  });

  it('provides non-empty descriptions and valid link entries', () => {
    for (const section of customersInfoContent.sections) {
      expect(section.description.length).toBeGreaterThan(0);
      for (const link of section.links ?? []) {
        expect(link.url).toMatch(/^https?:\/\//);
        expect(link.title.length).toBeGreaterThan(0);
      }
    }
    expect(customersInfoContent.sections[0].links?.[0]?.url).toContain('tanstack.com');
    expect(customersInfoContent.sections[2].links?.[0]?.url).toContain('nuqs');
  });
});
