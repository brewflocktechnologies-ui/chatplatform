import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useMediaQuery } from '@/hooks/use-media-query';

type ChangeHandler = (e: { matches: boolean }) => void;

function stubMatchMedia(initialMatches: boolean) {
  const listeners: ChangeHandler[] = [];
  const mql = {
    matches: initialMatches,
    media: '(max-width: 768px)',
    addEventListener: (_: string, handler: ChangeHandler) => listeners.push(handler),
    removeEventListener: (_: string, handler: ChangeHandler) => {
      const index = listeners.indexOf(handler);
      if (index !== -1) listeners.splice(index, 1);
    }
  };
  window.matchMedia = vi.fn().mockReturnValue(mql);
  return {
    listeners,
    fireChange: (matches: boolean) => listeners.forEach((l) => l({ matches }))
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useMediaQuery', () => {
  it('reports the initial match state', () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery());
    expect(result.current.isOpen).toBe(true);
  });

  it('starts closed when the query does not match', () => {
    stubMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery());
    expect(result.current.isOpen).toBe(false);
  });

  it('updates when the media query changes', () => {
    const media = stubMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery());
    act(() => media.fireChange(true));
    expect(result.current.isOpen).toBe(true);
    act(() => media.fireChange(false));
    expect(result.current.isOpen).toBe(false);
  });

  it('removes its listener on unmount', () => {
    const media = stubMatchMedia(false);
    const { unmount } = renderHook(() => useMediaQuery());
    expect(media.listeners).toHaveLength(1);
    unmount();
    expect(media.listeners).toHaveLength(0);
  });
});
