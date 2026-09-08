import { describe, it, expect } from 'vitest';
import { widgetModifierInfoContent } from '@/features/widget-modifier/info-content';

describe('widgetModifierInfoContent', () => {
  it('has a title and three sections', () => {
    expect(widgetModifierInfoContent.title).toBe('Widget Modifier — Federated MFE');
    expect(widgetModifierInfoContent.sections).toHaveLength(3);
    expect(widgetModifierInfoContent.sections.map((s) => s.title)).toEqual([
      'Overview',
      'Configs collection',
      'Deep links'
    ]);
  });

  it('provides non-empty descriptions and empty link lists', () => {
    for (const section of widgetModifierInfoContent.sections) {
      expect(section.description.length).toBeGreaterThan(0);
      expect(section.links).toEqual([]);
    }
  });
});
