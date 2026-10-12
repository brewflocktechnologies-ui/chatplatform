import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
// Explicit extension: `@/hooks/use-mobile` resolves to the .ts twin.
// @ts-expect-error TS5097: tsconfig does not allow .tsx import specifiers
import { useIsMobile } from '@/hooks/use-mobile.tsx';

const original = window.innerWidth;

function stub(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
  const listeners: (() => void)[] = [];
  window.matchMedia = vi.fn().mockImplementation(() => ({
    addEventListener: (_: string, h: () => void) => listeners.push(h),
    removeEventListener: (_: string, h: () => void) => {
      listeners.splice(listeners.indexOf(h), 1);
    }
  })) as never;
  return listeners;
}

afterEach(() => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: original
  });
});

describe('useIsMobile (.tsx)', () => {
  it('reflects the viewport and reacts to media query changes', () => {
    const listeners = stub(500);
    const { result, unmount } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1200
    });
    act(() => listeners.forEach((l) => l()));
    expect(result.current).toBe(false);
    unmount();
    expect(listeners).toHaveLength(0);
  });
});
