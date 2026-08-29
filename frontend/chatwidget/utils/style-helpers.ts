/**
 * utils/style-helpers.ts
 * Pure style computation functions ported from alpine/bubble.js and alpine/chatbar.js.
 * These are dependency-free pure functions — no Lit/Alpine imports.
 */

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

/** Converts a hex color string to rgba(...). */
export function hexToRgba(hex: string, alpha = 1): string {
  if (!hex) return '';
  if (hex.startsWith('#')) {
    const v = hex.replace('#', '');
    const normalized = v.length === 3 ? v.split('').map((c) => c + c).join('') : v;
    const bigint = parseInt(normalized, 16);
    if (!isNaN(bigint)) {
      return `rgba(${(bigint >> 16) & 255},${(bigint >> 8) & 255},${bigint & 255},${alpha})`;
    }
  }
  return hex;
}

// ---------------------------------------------------------------------------
// Border radius
// ---------------------------------------------------------------------------

export interface BorderRadiusConfig {
  tl?: number;
  tr?: number;
  br?: number;
  bl?: number;
}

export function getBorderRadius(
  borderRadius: number | BorderRadiusConfig | undefined,
  fallback = '50%'
): string {
  if (borderRadius === undefined || borderRadius === null) return fallback;
  if (typeof borderRadius === 'number') return `${borderRadius}px`;
  if (typeof borderRadius === 'object') {
    const { tl = 50, tr = 50, br = 50, bl = 50 } = borderRadius;
    return `${tl}px ${tr}px ${br}px ${bl}px`;
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Gradient
// ---------------------------------------------------------------------------

export interface GradientStop {
  color: string;
  pos: number;
}

export function getGradient(
  gradientType: string | undefined,
  gradientStops: GradientStop[],
  gradientAngle = 135,
  fallbackColor = '#0b5fff'
): string {
  if (!gradientType || gradientType === 'none') return '';
  if (!gradientStops || gradientStops.length === 0) return fallbackColor;
  const stops = gradientStops.map((s) => `${s.color} ${s.pos}%`).join(', ');
  if (gradientType === 'radial') return `radial-gradient(circle, ${stops})`;
  if (gradientType === 'conic') return `conic-gradient(from ${gradientAngle}deg, ${stops})`;
  return `linear-gradient(${gradientAngle}deg, ${stops})`;
}

// ---------------------------------------------------------------------------
// Box shadow
// ---------------------------------------------------------------------------

export function getBoxShadow(config: {
  boxShadowOffsetX?: number;
  boxShadowOffsetY?: number;
  boxShadowSpread?: number;
  boxShadowBlur?: number;
  boxShadowOpacity?: number;
}): string {
  const opacity = config.boxShadowOpacity !== undefined ? config.boxShadowOpacity : 0.25;
  if (opacity <= 0) return 'none';

  const offsetX = config.boxShadowOffsetX !== undefined ? config.boxShadowOffsetX : 0;
  const offsetY = config.boxShadowOffsetY !== undefined ? config.boxShadowOffsetY : 8;
  const blur = config.boxShadowBlur !== undefined ? config.boxShadowBlur : 20;
  const spread = config.boxShadowSpread !== undefined ? config.boxShadowSpread : 0;

  return `${offsetX}px ${offsetY}px ${blur}px ${spread}px rgba(0,0,0,${opacity})`;
}

export function getInnerShadow(config: {
  innerShadow?: { enabled?: boolean; blur?: number; opacity?: number };
}): string {
  if (!config.innerShadow || !config.innerShadow.enabled) return '';
  return `inset 0 6px ${config.innerShadow.blur ?? 12}px rgba(0,0,0,${config.innerShadow.opacity ?? 0.25})`;
}

// ---------------------------------------------------------------------------
// Composite background (bubble)
// ---------------------------------------------------------------------------

export function getCompositeBackground(config: {
  useWebsiteTheme?: boolean;
  backgroundColor?: string;
  gradientType?: string;
  gradientStops?: GradientStop[];
  gradientAngle?: number;
}): string {
  if (config.useWebsiteTheme) return config.backgroundColor || '#0b5fff';
  if (config.gradientType && config.gradientType !== 'none') {
    return getGradient(
      config.gradientType,
      config.gradientStops || [],
      config.gradientAngle ?? 135,
      config.backgroundColor || '#0b5fff'
    );
  }
  return config.backgroundColor || '#0b5fff';
}

// ---------------------------------------------------------------------------
// Chatbar background
// ---------------------------------------------------------------------------

export function getChatbarBackground(config: {
  useWebsiteTheme?: boolean;
  accentColor?: string;
  gradientEnabled?: boolean;
  bgColor?: string;
  gradientType?: string;
  gradientStops?: GradientStop[];
  gradientAngle?: number;
}): string {
  if (config.useWebsiteTheme) return config.accentColor || '#0b5fff';
  if (!config.gradientEnabled) return config.bgColor || '#007bff';
  const stopsArray = config.gradientStops || [];
  if (stopsArray.length === 0) return config.bgColor || '#007bff';
  const stops = stopsArray.map((s) => `${s.color} ${s.pos}%`).join(', ');
  switch (config.gradientType) {
    case 'linear':
      return `linear-gradient(${config.gradientAngle ?? 90}deg, ${stops})`;
    case 'radial':
      return `radial-gradient(circle, ${stops})`;
    case 'conic':
      return `conic-gradient(from ${config.gradientAngle ?? 90}deg, ${stops})`;
    default:
      return config.bgColor || '#007bff';
  }
}

// ---------------------------------------------------------------------------
// Chatbar text / icon sizing
// ---------------------------------------------------------------------------

export function getChatbarFontSize(textSize = 14, height = 40): string {
  return Math.min(textSize, Math.max(12, Math.floor(height * 0.35))) + 'px';
}

export function getChatbarIconWidth(iconWidth = 20, height = 40, type = 'lucide'): number {
  return Math.min(iconWidth, Math.max(16, Math.floor(height * (type === 'customSvg' ? 0.55 : 0.5))));
}

export function getChatbarIconHeight(iconHeight = 20, barHeight = 40, type = 'lucide'): number {
  return Math.min(iconHeight, Math.max(16, Math.floor(barHeight * (type === 'customSvg' ? 0.55 : 0.5))));
}

// ---------------------------------------------------------------------------
// Tooltip style helpers (bubble)
// ---------------------------------------------------------------------------

export function getTooltipBorderRadius(
  borderRadius: number | BorderRadiusConfig | undefined,
  pos: string
): string {
  if (borderRadius !== undefined) {
    if (typeof borderRadius === 'object') {
      const { tl = 20, tr = 20, br = 20, bl = 20 } = borderRadius;
      return `${tl}px ${tr}px ${br}px ${bl}px`;
    }
    if (typeof borderRadius === 'number') return borderRadius + 'px';
    return String(borderRadius);
  }
  if (pos === 'left') return '20px 20px 4px 20px';
  if (pos === 'right') return '20px 20px 20px 4px';
  return '20px';
}

// ---------------------------------------------------------------------------
// Misc helpers
// ---------------------------------------------------------------------------

/** Returns the correct animation class string for a greet-window icon animation. */
export function getAnimClass(animation: string | undefined): string {
  if (!animation || animation === 'none') return '';
  return `anim-zotly-${animation}`;
}

/** Formats a Date-like ISO string into HH:MM. */
export function formatTime(isoString: string | undefined): string {
  const d = isoString ? new Date(isoString) : new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
