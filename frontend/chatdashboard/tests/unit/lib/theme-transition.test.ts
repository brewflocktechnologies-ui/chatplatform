import { afterEach, describe, expect, it, vi } from 'vitest';
import { startThemeTransition } from '@/lib/theme-transition';

type DocumentWithVT = Omit<Document, 'startViewTransition'> & {
  startViewTransition?: (cb: () => void) => void;
};

const doc = document as unknown as DocumentWithVT;

describe('startThemeTransition', () => {
  afterEach(() => {
    delete doc.startViewTransition;
    document.documentElement.style.removeProperty('--x');
    document.documentElement.style.removeProperty('--y');
  });

  it('applies immediately when the View Transitions API is unavailable', () => {
    delete doc.startViewTransition;
    const apply = vi.fn();

    startThemeTransition(apply, { clientX: 10, clientY: 20 });

    expect(apply).toHaveBeenCalledTimes(1);
    expect(document.documentElement.style.getPropertyValue('--x')).toBe('');
  });

  it('sets the reveal origin and starts a view transition when available', () => {
    const startViewTransition = vi.fn((cb: () => void) => cb());
    doc.startViewTransition = startViewTransition;
    const apply = vi.fn();

    startThemeTransition(apply, { clientX: 12, clientY: 34 });

    expect(document.documentElement.style.getPropertyValue('--x')).toBe('12px');
    expect(document.documentElement.style.getPropertyValue('--y')).toBe('34px');
    expect(startViewTransition).toHaveBeenCalledWith(apply);
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it('skips setting the origin when none is given', () => {
    const startViewTransition = vi.fn();
    doc.startViewTransition = startViewTransition;
    const apply = vi.fn();

    startThemeTransition(apply);

    expect(document.documentElement.style.getPropertyValue('--x')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--y')).toBe('');
    expect(startViewTransition).toHaveBeenCalledWith(apply);
  });
});
