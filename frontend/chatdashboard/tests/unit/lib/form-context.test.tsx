import { describe, expect, it } from 'vitest';
import * as React from 'react';
import { renderHook } from '@testing-library/react';
import { fieldContext, formContext, useFieldContext, useFormContext, useFieldInvalid } from '@/lib/form-context';

function makeField(isTouched: boolean, isValid: boolean) {
  return { state: { meta: { isTouched, isValid } } };
}

function fieldWrapper(field: ReturnType<typeof makeField>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <fieldContext.Provider value={field as never}>{children}</fieldContext.Provider>
    );
  };
}

describe('form contexts', () => {
  it('exposes the contexts and hooks from createFormHookContexts', () => {
    expect(fieldContext).toBeDefined();
    expect(formContext).toBeDefined();
    expect(typeof useFieldContext).toBe('function');
    expect(typeof useFormContext).toBe('function');
  });

  it('useFieldContext returns the provided field', () => {
    const field = makeField(false, true);
    const { result } = renderHook(() => useFieldContext(), {
      wrapper: fieldWrapper(field)
    });
    expect(result.current).toBe(field);
  });
});

describe('useFieldInvalid', () => {
  it('is true for a touched invalid field', () => {
    const { result } = renderHook(() => useFieldInvalid(), {
      wrapper: fieldWrapper(makeField(true, false))
    });
    expect(result.current).toBe(true);
  });

  it('is false for an untouched field', () => {
    const { result } = renderHook(() => useFieldInvalid(), {
      wrapper: fieldWrapper(makeField(false, false))
    });
    expect(result.current).toBe(false);
  });

  it('is false for a touched valid field', () => {
    const { result } = renderHook(() => useFieldInvalid(), {
      wrapper: fieldWrapper(makeField(true, true))
    });
    expect(result.current).toBe(false);
  });
});
