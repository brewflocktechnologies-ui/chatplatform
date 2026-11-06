
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import { configure } from '@testing-library/react';

// Full-suite runs (especially with coverage) are CPU-bound.
configure({ asyncUtilTimeout: 5000 });

// Browser API mocks are only available in browser-like environments.
if (typeof window !== 'undefined' && typeof Element !== 'undefined') {
  if (!window.matchMedia) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
  }

  if (!window.ResizeObserver) {
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }

  if (!window.IntersectionObserver) {
    window.IntersectionObserver = class IntersectionObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    } as unknown as typeof IntersectionObserver;
  }

  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
}
