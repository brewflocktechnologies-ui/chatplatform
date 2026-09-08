import { describe, expect, it, vi } from 'vitest';
import * as React from 'react';
import { renderHook } from '@testing-library/react';
import { composeRefs, useComposedRefs } from '@/lib/compose-refs';

describe('composeRefs', () => {
  it('sets function refs and object refs to the node', () => {
    const fnRef = vi.fn();
    const objRef = React.createRef<HTMLDivElement>();
    const node = document.createElement('div');

    const composed = composeRefs<HTMLDivElement>(fnRef, objRef);
    const result = composed(node);

    expect(fnRef).toHaveBeenCalledWith(node);
    expect(objRef.current).toBe(node);
    expect(result).toBeUndefined();
  });

  it('ignores null and undefined refs', () => {
    const objRef = React.createRef<HTMLDivElement>();
    const node = document.createElement('div');

    const composed = composeRefs<HTMLDivElement>(null, undefined, objRef);
    expect(() => composed(node)).not.toThrow();
    expect(objRef.current).toBe(node);
  });

  it('returns no cleanup when no ref returns one', () => {
    const noopRef: React.RefCallback<HTMLDivElement> = vi.fn();
    const composed = composeRefs<HTMLDivElement>(noopRef, React.createRef<HTMLDivElement>());
    expect(composed(document.createElement('div'))).toBeUndefined();
  });

  it('returns a composed cleanup when a callback ref returns one', () => {
    const cleanupA = vi.fn();
    const cleanupB = vi.fn();
    const fnWithCleanupA = vi.fn(() => cleanupA);
    const fnWithCleanupB = vi.fn(() => cleanupB);
    const objRef = React.createRef<HTMLDivElement>();
    const plainFnRef = vi.fn();
    const node = document.createElement('div');

    const composed = composeRefs<HTMLDivElement>(fnWithCleanupA, fnWithCleanupB, objRef, plainFnRef);
    const dispose = composed(node);

    expect(objRef.current).toBe(node);
    expect(typeof dispose).toBe('function');

    (dispose as () => void)();

    expect(cleanupA).toHaveBeenCalledTimes(1);
    expect(cleanupB).toHaveBeenCalledTimes(1);
    // refs without a cleanup are reset to null instead
    expect(objRef.current).toBeNull();
    expect(plainFnRef).toHaveBeenLastCalledWith(null);
  });
});

describe('useComposedRefs', () => {
  it('returns a memoized callback that composes the given refs', () => {
    const fnRef = vi.fn();
    const objRef = React.createRef<HTMLDivElement>();
    const node = document.createElement('div');

    const { result, rerender } = renderHook(() => useComposedRefs<HTMLDivElement>(fnRef, objRef));

    const first = result.current;
    first(node);

    expect(fnRef).toHaveBeenCalledWith(node);
    expect(objRef.current).toBe(node);

    rerender();
    expect(result.current).toBe(first);
  });
});
