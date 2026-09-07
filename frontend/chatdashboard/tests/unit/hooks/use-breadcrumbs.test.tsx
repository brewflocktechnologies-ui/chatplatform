import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';

const usePathname = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => usePathname()
}));

beforeEach(() => {
  usePathname.mockReset();
});

describe('useBreadcrumbs', () => {
  it('uses the custom mapping for /dashboard', () => {
    usePathname.mockReturnValue('/dashboard');
    const { result } = renderHook(() => useBreadcrumbs());
    expect(result.current).toEqual([{ title: 'Dashboard', link: '/dashboard' }]);
  });

  it('uses the custom mapping for /dashboard/product', () => {
    usePathname.mockReturnValue('/dashboard/product');
    const { result } = renderHook(() => useBreadcrumbs());
    expect(result.current).toEqual([
      { title: 'Dashboard', link: '/dashboard' },
      { title: 'Product', link: '/dashboard/product' }
    ]);
  });

  it('generates capitalized crumbs from unmapped paths', () => {
    usePathname.mockReturnValue('/dashboard/customers');
    const { result } = renderHook(() => useBreadcrumbs());
    expect(result.current).toEqual([
      { title: 'Dashboard', link: '/dashboard' },
      { title: 'Customers', link: '/dashboard/customers' }
    ]);
  });

  it('builds one crumb per segment for deep paths', () => {
    usePathname.mockReturnValue('/dashboard/forms/multi-step');
    const { result } = renderHook(() => useBreadcrumbs());
    expect(result.current.map((c) => c.title)).toEqual(['Dashboard', 'Forms', 'Multi-step']);
    expect(result.current[2].link).toBe('/dashboard/forms/multi-step');
  });

  it('returns no crumbs for the root path', () => {
    usePathname.mockReturnValue('/');
    const { result } = renderHook(() => useBreadcrumbs());
    expect(result.current).toEqual([]);
  });
});
