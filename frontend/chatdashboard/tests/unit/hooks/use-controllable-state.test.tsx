import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useControllableState } from '@/hooks/use-controllable-state';

describe('useControllableState', () => {
  it('uncontrolled: holds state, calls onChange after it changes', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useControllableState({ defaultProp: 1, onChange }));
    expect(result.current[0]).toBe(1);
    act(() => result.current[1](2));
    expect(result.current[0]).toBe(2);
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('uncontrolled: supports functional updates and a default no-op onChange', () => {
    const { result } = renderHook(() => useControllableState<number>({ defaultProp: 1 }));
    act(() => result.current[1]((prev) => (prev ?? 0) + 5));
    expect(result.current[0]).toBe(6);
  });

  it('controlled: reflects prop and only reports changes', () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ prop }) => useControllableState({ prop, onChange }),
      { initialProps: { prop: 'a' } }
    );
    expect(result.current[0]).toBe('a');
    act(() => result.current[1]('b'));
    expect(onChange).toHaveBeenCalledWith('b');
    expect(result.current[0]).toBe('a'); // parent has not updated yet
    rerender({ prop: 'b' });
    expect(result.current[0]).toBe('b');
  });

  it('controlled: functional updates see the prop and unchanged values are ignored', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useControllableState({ prop: 3, onChange }));
    act(() => result.current[1]((prev) => (prev as number) + 1));
    expect(onChange).toHaveBeenCalledWith(4);
    onChange.mockClear();
    act(() => result.current[1](3));
    expect(onChange).not.toHaveBeenCalled();
  });
});
