import { describe, it, expect } from 'vitest';
import { reactQueryInfoContent } from '@/features/react-query-demo/info-content';

describe('reactQueryInfoContent', () => {
  it('has a title and four sections', () => {
    expect(reactQueryInfoContent.title).toBe('React Query Pattern');
    expect(reactQueryInfoContent.sections).toHaveLength(4);
    expect(reactQueryInfoContent.sections.map((s) => s.title)).toEqual([
      'Server Prefetch',
      'Query Options',
      'Suspense Query',
      'Optimistic Mutations'
    ]);
  });

  it('provides non-empty descriptions and tanstack docs links', () => {
    for (const section of reactQueryInfoContent.sections) {
      expect(section.description.length).toBeGreaterThan(0);
      for (const link of section.links ?? []) {
        expect(link.url).toContain('tanstack.com');
        expect(link.title.length).toBeGreaterThan(0);
      }
    }
    expect(reactQueryInfoContent.sections[2].links).toEqual([]);
  });
});
