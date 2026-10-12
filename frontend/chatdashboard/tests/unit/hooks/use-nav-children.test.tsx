import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFilteredNavGroups, useFilteredNavItems } from '@/hooks/use-nav';
import type { NavGroup, NavItem } from '@/types';

vi.mock('@/features/auth/mock-auth', () => ({
  useMockAuth: () => ({ user: null })
}));

const item = (overrides: Partial<NavItem>): NavItem => ({
  title: 'Item',
  url: '/dashboard/item',
  items: [],
  ...overrides
});

afterEach(() => vi.restoreAllMocks());

describe('useFilteredNavItems child filtering', () => {
  it('filters children by access rules', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const items = [
      item({
        title: 'Parent',
        items: [
          item({ title: 'Plain' }),
          item({ title: 'Org', access: { requireOrg: true } }),
          item({ title: 'Perm', access: { permission: 'org:x:y' } }),
          item({ title: 'AdminRole', access: { role: 'admin' } }),
          item({ title: 'MemberRole', access: { role: 'member' } }),
          item({ title: 'PlanChild', access: { plan: 'pro' } }),
          item({ title: 'FeatureChild', access: { feature: 'beta' } })
        ]
      })
    ];
    const { result } = renderHook(() => useFilteredNavItems(items));
    expect(result.current[0].items!.map((i) => i.title)).toEqual([
      'Plain',
      'Org',
      'AdminRole',
      'PlanChild',
      'FeatureChild'
    ]);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('works without a signed-in user', () => {
    const { result } = renderHook(() => useFilteredNavItems([item({ title: 'A' })]));
    expect(result.current).toHaveLength(1);
  });

  it('drops groups whose items are all filtered out', () => {
    const groups: NavGroup[] = [
      { label: 'Visible', items: [item({ title: 'A' })] },
      { label: 'Hidden', items: [item({ title: 'B', access: { permission: 'nope' } })] }
    ];
    const { result } = renderHook(() => useFilteredNavGroups(groups));
    expect(result.current.map((g) => g.label)).toEqual(['Visible']);
  });
});
