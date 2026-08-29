/**
 * Token theme — single source of truth for every --cw-* value.
 * Values are the exact defaults that used to be hand-written in
 * core-styles.ts (:root / .dark). Theme → CSS compilation lives in css.ts.
 */

export interface TokenColors {
  bg: string;
  surface: string;
  border: string;
  ink: string;
  muted: string;
  accent: string;
  accentDeep: string;
  accentSoft: string;
  accentTint: string;
}

export interface TokenStatus {
  success: string;
  warning: string;
  error: string;
  focusRing: string;
}

export interface TokenTypography {
  family: string;
  'size-xs': string;
  'size-sm': string;
  'size-md': string;
  'size-lg': string;
  'size-xl': string;
  'size-2xl': string;
}

export interface TokenSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
}

export interface TokenRadius {
  sm: string;
  md: string;
  lg: string;
  full: string;
}

export interface TokenTheme {
  version: 'v1';
  colors: TokenColors;
  status: TokenStatus;
  typography: TokenTypography;
  spacing: TokenSpacing;
  radius: TokenRadius;
  grad: string;
  /** Dark-mode overrides (only the tokens that flip). */
  dark?: {
    colors: Partial<TokenColors>;
    status: Partial<TokenStatus>;
  };
}

export const DEFAULT_TOKEN_THEME: TokenTheme = {
  version: 'v1',
  colors: {
    bg: '#f6f7fa',
    surface: '#ffffff',
    border: '#e9ecf1',
    ink: '#101828',
    muted: '#667085',
    accent: '#0b5fff',
    accentDeep: 'color-mix(in srgb, var(--cw-accent) 74%, #101828)',
    accentSoft: 'color-mix(in srgb, var(--cw-accent) 8%, #ffffff)',
    accentTint: 'color-mix(in srgb, var(--cw-accent) 14%, #ffffff)',
  },
  status: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#f43f5e',
    focusRing: '#0b5fff',
  },
  typography: {
    family:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    'size-xs': '0.75rem',
    'size-sm': '0.875rem',
    'size-md': '1rem',
    'size-lg': '1.125rem',
    'size-xl': '1.5rem',
    'size-2xl': '1.875rem',
  },
  spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem' },
  radius: { sm: '0.375rem', md: '0.5rem', lg: '1rem', full: '9999px' },
  grad: 'linear-gradient(135deg, var(--cw-accent), var(--cw-accent-deep))',
  dark: {
    colors: {
      bg: '#0f172a',
      surface: '#1e293b',
      border: '#334155',
      ink: '#f8fafc',
      muted: '#94a3b8',
    },
    status: {
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      focusRing: '#60a5fa',
    },
  },
};

/** Typed override shape so clients only ship what they change. */
export type PartialTokenTheme = {
  [K in keyof TokenTheme]?: TokenTheme[K] extends object ? Partial<TokenTheme[K]> : TokenTheme[K];
};
