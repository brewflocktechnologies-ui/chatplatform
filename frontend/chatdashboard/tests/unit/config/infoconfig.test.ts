import { describe, it, expect } from 'vitest';
import {
  workspacesInfoContent,
  teamInfoContent,
  billingInfoContent,
  productInfoContent
} from '@/config/infoconfig';

type Content = typeof workspacesInfoContent;

function expectWellFormed(content: Content) {
  expect(typeof content.title).toBe('string');
  expect(content.title.length).toBeGreaterThan(0);
  expect(content.sections.length).toBeGreaterThan(0);
  for (const section of content.sections) {
    expect(typeof section.title).toBe('string');
    expect(section.title.length).toBeGreaterThan(0);
    expect(typeof section.description).toBe('string');
    expect(section.description.length).toBeGreaterThan(0);
    expect(Array.isArray(section.links)).toBe(true);
    for (const link of section.links ?? []) {
      expect(typeof link.title).toBe('string');
      expect(typeof link.url).toBe('string');
    }
  }
}

describe('workspacesInfoContent', () => {
  it('is well formed', () => {
    expectWellFormed(workspacesInfoContent);
  });

  it('describes workspace management with 5 sections', () => {
    expect(workspacesInfoContent.title).toBe('Workspaces Management');
    expect(workspacesInfoContent.sections).toHaveLength(5);
    expect(workspacesInfoContent.sections[0].links?.[0]?.url).toContain('clerk.com');
  });
});

describe('teamInfoContent', () => {
  it('is well formed', () => {
    expectWellFormed(teamInfoContent);
  });

  it('describes team management with 6 sections', () => {
    expect(teamInfoContent.title).toBe('Team Management');
    expect(teamInfoContent.sections).toHaveLength(6);
    expect(teamInfoContent.sections.map((s) => s.title)).toContain('Navigation RBAC System');
  });
});

describe('billingInfoContent', () => {
  it('is well formed', () => {
    expectWellFormed(billingInfoContent);
  });

  it('describes billing with 7 sections', () => {
    expect(billingInfoContent.title).toBe('Billing & Plans');
    expect(billingInfoContent.sections).toHaveLength(7);
    expect(billingInfoContent.sections[1].links?.[0]?.url).toContain('dashboard.clerk.com');
  });
});

describe('productInfoContent', () => {
  it('is well formed', () => {
    expectWellFormed(productInfoContent);
  });

  it('describes product management with 6 sections', () => {
    expect(productInfoContent.title).toBe('Product Management');
    expect(productInfoContent.sections).toHaveLength(6);
    expect(productInfoContent.sections[4].links).toHaveLength(2);
  });
});
