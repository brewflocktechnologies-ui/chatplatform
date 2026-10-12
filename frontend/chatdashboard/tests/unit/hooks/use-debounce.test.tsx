import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDebounce } from '@/hooks/use-debounce';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useDebounce', () => {
  it('returns the initial value immediately and the latest value after the delay', () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 300), {
      initialProps: { v: 'a' }
    });
    expect(result.current).toBe('a');
    rerender({ v: 'b' });
    expect(result.current).toBe('a');
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe('a');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('b');
  });

  it('restarts the timer when the value changes again', () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 100), {
      initialProps: { v: 1 }
    });
    rerender({ v: 2 });
    act(() => {
      vi.advanceTimersByTime(80);
    });
    rerender({ v: 3 });
    act(() => {
      vi.advanceTimersByTime(80);
    });
    expect(result.current).toBe(1);
    act(() => {
      vi.advanceTimersByTime(20);
    });
    expect(result.current).toBe(3);
  });
});

describe('useDebouncedCallback', () => {
  it('calls the latest callback once with the last arguments after the delay', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(({ cb }) => useDebouncedCallback(cb, 200), {
      initialProps: { cb: first as (...a: never[]) => unknown }
    });
    act(() => {
      (result.current as any)('x');
      (result.current as any)('y');
    });
    rerender({ cb: second });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledWith('y');
  });

  it('cancels a pending call on unmount', () => {
    const cb = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedCallback(cb, 200));
    act(() => {
      (result.current as any)();
    });
    unmount();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(cb).not.toHaveBeenCalled();
  });
});
