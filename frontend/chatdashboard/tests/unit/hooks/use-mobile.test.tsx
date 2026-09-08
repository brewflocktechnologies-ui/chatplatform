import { describe, expect, it, vi, beforeEach, afterAll } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useIsMobile } from '@/hooks/use-mobile';

type ChangeHandler = () => void;

const originalInnerWidth = window.innerWidth;

function setInnerWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width
  });
}

function stubMatchMedia() {
  const listeners: ChangeHandler[] = [];
  const matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: window.innerWidth < 768,
    media: query,
    addEventListener: (_: string, handler: ChangeHandler) => listeners.push(handler),
    removeEventListener: (_: string, handler: ChangeHandler) => {
      const index = listeners.indexOf(handler);
      if (index !== -1) listeners.splice(index, 1);
    }
  }));
  window.matchMedia = matchMedia;
  return {
    matchMedia,
    listeners,
    fireChange: () => listeners.forEach((listener) => listener())
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterAll(() => {
  setInnerWidth(originalInnerWidth);
});

describe('useIsMobile', () => {
  it('returns false on a desktop viewport', () => {
    setInnerWidth(1024);
    const media = stubMatchMedia();
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
    expect(media.matchMedia).toHaveBeenCalledWith('(max-width: 767px)');
  });

  it('returns true on a mobile viewport', () => {
    setInnerWidth(500);
    stubMatchMedia();
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('updates when the media query change event fires', () => {
    setInnerWidth(1024);
    const media = stubMatchMedia();
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      setInnerWidth(600);
      media.fireChange();
    });
    expect(result.current).toBe(true);

    act(() => {
      setInnerWidth(900);
      media.fireChange();
    });
    expect(result.current).toBe(false);
  });

  it('removes the change listener on unmount', () => {
    setInnerWidth(1024);
    const media = stubMatchMedia();
    const { unmount } = renderHook(() => useIsMobile());
    expect(media.listeners).toHaveLength(1);
    unmount();
    expect(media.listeners).toHaveLength(0);
  });
});
