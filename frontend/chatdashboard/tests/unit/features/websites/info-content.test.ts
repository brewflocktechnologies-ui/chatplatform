import { describe, it, expect } from 'vitest';
import { websitesInfoContent } from '@/features/websites/info-content';

describe('websitesInfoContent', () => {
  it('has a title and three sections', () => {
    expect(websitesInfoContent.title).toBe('Websites — MongoDB + React Query');
    expect(websitesInfoContent.sections).toHaveLength(3);
    expect(websitesInfoContent.sections.map((s) => s.title)).toEqual([
      'Overview',
      'CRUD',
      'Widget tools'
    ]);
  });

  it('provides non-empty descriptions and empty link lists', () => {
    for (const section of websitesInfoContent.sections) {
      expect(section.description.length).toBeGreaterThan(0);
      expect(section.links).toEqual([]);
    }
  });
});
