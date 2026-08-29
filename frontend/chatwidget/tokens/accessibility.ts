import { unsafeCSS } from 'lit';

/**
 * Shared a11y stylesheet: disables/reduces animations for users who prefer
 * reduced motion. Included in every component that animates.
 */
export const REDUCED_MOTION_CSS = unsafeCSS(`
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
`);
