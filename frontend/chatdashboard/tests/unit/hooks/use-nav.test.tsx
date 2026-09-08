import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFilteredNavItems, useFilteredNavGroups } from '@/hooks/use-nav';
import type { NavItem, NavGroup } from '@/types';

vi.mock('@/features/auth/mock-auth', () => ({
  useMockAuth: () => ({
    user: { id: 'demo-user', fullName: 'Demo User', email: 'demo@example.com' },
    isAuthenticated: true,
    isLoaded: true,
    login: vi.fn(),
    logout: vi.fn()
  })
}));

const item = (overrides: Partial<NavItem>): NavItem => ({
  title: 'Item',
  url: '/dashboard/item',
  items: [],
  ...overrides
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useFilteredNavItems', () => {
  it('keeps items without access restrictions', () => {
    const items = [item({ title: 'Open' })];
    const { result } = renderHook(() => useFilteredNavItems(items));
    expect(result.current.map((i) => i.title)).toEqual(['Open']);
  });

  it('keeps org-gated items because the demo org is always present', () => {
    const items = [item({ title: 'OrgOnly', access: { requireOrg: true } })];
    const { result } = renderHook(() => useFilteredNavItems(items));
    expect(result.current.map((i) => i.title)).toEqual(['OrgOnly']);
  });

  it('hides items requiring a permission the user does not have', () => {
    const items = [
      item({ title: 'Open' }),
      item({ title: 'Gated', access: { requireOrg: true, permission: 'org:teams:manage' } })
    ];
    const { result } = renderHook(() => useFilteredNavItems(items));
    expect(result.current.map((i) => i.title)).toEqual(['Open']);
  });

  it('keeps items matching the admin role and hides other roles', () => {
    const items = [
      item({ title: 'AdminOnly', access: { role: 'admin' } }),
      item({ title: 'MemberOnly', access: { role: 'member' } })
    ];
    const { result } = renderHook(() => useFilteredNavItems(items));
    expect(result.current.map((i) => i.title)).toEqual(['AdminOnly']);
  });

  it('shows plan/feature-gated items but warns that page-level checks are needed', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const items = [item({ title: 'ProPlan', access: { plan: 'pro' } })];
    const { result } = renderHook(() => useFilteredNavItems(items));
    expect(result.current.map((i) => i.title)).toEqual(['ProPlan']);
    expect(warn).toHaveBeenCalledOnce();
  });

  it('filters child items recursively', () => {
    const items = [
      item({
        title: 'Parent',
        items: [
          item({ title: 'VisibleChild' }),
          item({ title: 'HiddenChild', access: { permission: 'org:secret' } })
        ]
      })
    ];
    const { result } = renderHook(() => useFilteredNavItems(items));
    expect(result.current[0].items?.map((i) => i.title)).toEqual(['VisibleChild']);
  });
});

const group = (label: string, items: NavItem[]): NavGroup => ({ label, items });

describe('useFilteredNavGroups', () => {
  it('preserves group structure for visible items', () => {
    const groups = [group('Overview', [item({ title: 'Dashboard' }), item({ title: 'Chat' })])];
    const { result } = renderHook(() => useFilteredNavGroups(groups));
    expect(result.current).toHaveLength(1);
    expect(result.current[0].label).toBe('Overview');
    expect(result.current[0].items.map((i) => i.title)).toEqual(['Dashboard', 'Chat']);
  });

  it('drops groups whose items are all filtered out', () => {
    const groups = [
      group('Visible', [item({ title: 'Open' })]),
      group('Hidden', [item({ title: 'Gated', access: { permission: 'org:secret' } })])
    ];
    const { result } = renderHook(() => useFilteredNavGroups(groups));
    expect(result.current.map((g) => g.label)).toEqual(['Visible']);
  });

  it('does not leak items across groups', () => {
    const groups = [group('A', [item({ title: 'ItemA' })]), group('B', [item({ title: 'ItemB' })])];
    const { result } = renderHook(() => useFilteredNavGroups(groups));
    expect(result.current[0].items.map((i) => i.title)).toEqual(['ItemA']);
    expect(result.current[1].items.map((i) => i.title)).toEqual(['ItemB']);
  });
});
