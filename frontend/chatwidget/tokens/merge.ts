/**
 * Defensive merge of an untrusted partial token-theme over the defaults.
 * Never throws: mismatches / invalid values fall back to the default and are
 * collected as warnings. Blocked: CSS injection inside non-copy string values.
 */

import {
  DEFAULT_TOKEN_THEME,
  type TokenTheme,
  type PartialTokenTheme,
} from './default-theme.js';

export interface MergeResult {
  theme: TokenTheme;
  warnings: string[];
}

/** A string is a CSS-injection attempt when it could close a rule and start another. */
function isCssInjection(value: string): boolean {
  const lower = value.toLowerCase();
  return (
    (value.includes(';') && (value.includes('{') || value.includes('}'))) ||
    lower.includes('</style') ||
    lower.includes('</script')
  );
}

interface GroupDef {
  key: keyof TokenTheme;
  prefix: string;
  copy?: boolean;
}

const GROUPS: GroupDef[] = [
  { key: 'colors', prefix: 'colors' },
  { key: 'status', prefix: 'status' },
  { key: 'typography', prefix: 'typography' },
  { key: 'spacing', prefix: 'spacing' },
  { key: 'radius', prefix: 'radius' },
];

/** Merge one flat token sub-object over its default, validating each entry. */
function mergeRecords<T extends Record<string, string>>(
  base: T,
  override: Record<string, unknown> | undefined,
  name: string,
  warnings: string[]
): T {
  const out: T = { ...base };
  if (!override || typeof override !== 'object') return out;

  for (const key of Object.keys(override)) {
    const value = (override as Record<string, unknown>)[key];

    // Unknown token in this group
    if (!(key in base)) {
      warnings.push(`unknown '${name}.${key}' ignored`);
      continue;
    }
    // Type mismatch
    if (typeof value !== 'string') {
      warnings.push(`'${name}.${key}' must be a string; using default`);
      continue;
    }
    // CSS-injection guard
    if (isCssInjection(value)) {
      warnings.push(`'${name}.${key}' rejected (suspicious value)`);
      continue;
    }
    (out as Record<string, string>)[key] = value;
  }
  return out;
}

/**
 * Deeply merge an untrusted partial theme over the defaults. Never throws.
 * Returns the valid theme plus a log of everything it rejected.
 */
export function mergeTheme(
  partial: PartialTokenTheme | undefined,
  defaults: TokenTheme = DEFAULT_TOKEN_THEME
): MergeResult {
  const warnings: string[] = [];
  const p = (partial && typeof partial === 'object' ? partial : {}) as PartialTokenTheme;

  // validate the version enum
  let version = defaults.version;
  if (p.version !== undefined) {
    if (p.version === 'v1') {
      version = p.version;
    } else {
      warnings.push(`unsupported version '${p.version}' — using '${defaults.version}'`);
    }
  }

  const theme: TokenTheme = {
    version,
    colors: mergeRecords({ ...defaults.colors }, p.colors, 'colors', warnings) as TokenTheme['colors'],
    status: mergeRecords({ ...defaults.status }, p.status, 'status', warnings) as TokenTheme['status'],
    typography: mergeRecords({ ...defaults.typography }, p.typography, 'typography', warnings) as TokenTheme['typography'],
    spacing: mergeRecords({ ...defaults.spacing }, p.spacing, 'spacing', warnings) as TokenTheme['spacing'],
    radius: mergeRecords({ ...defaults.radius }, p.radius, 'radius', warnings) as TokenTheme['radius'],
    grad: defaults.grad,
  };

  if (typeof p.grad === 'string' && !isCssInjection(p.grad)) {
    theme.grad = p.grad;
  } else if (p.grad !== undefined && typeof p.grad !== 'string') {
    warnings.push("'grad' must be a string, using default");
  } else if (p.grad !== undefined) {
    warnings.push("'grad' rejected (suspicious CSS injection)");
  }

  // dark overrides
  const darkColorBase: Partial<TokenTheme['colors']> = defaults.dark?.colors || {};
  const darkStatusBase: Partial<TokenTheme['status']> = defaults.dark?.status || {};
  const darkColorOverride = (p as any)?.dark?.colors as Record<string, unknown> | undefined;
  const darkStatusOverride = (p as any)?.dark?.status as Record<string, unknown> | undefined;
  theme.dark = {
    colors: mergeRecords(darkColorBase, darkColorOverride, 'dark.colors', warnings),
    status: mergeRecords(darkStatusBase, darkStatusOverride, 'dark.status', warnings),
  };

  // unknown top-level keys
  const known = new Set<string>(['version', 'colors', 'status', 'typography', 'spacing', 'radius', 'grad', 'dark']);
  Object.keys(p).forEach((k) => {
    if (!known.has(k)) warnings.push(`unknown top-level key '${k}' ignored`);
  });

  return { theme, warnings };
}

/**
 * Sanitizes a fetched (untrusted) client config before it is merged into the
 * store: deep-clones and drops any string value that carries a CSS-injection
 * payload, so remote configs cannot inject styles/scripts.
 */
export function sanitizeConfig<T>(value: T, name = 'config'): { value: T; warnings: string[] } {
  const warnings: string[] = [];
  const walk = (node: unknown, path: string): unknown => {
    if (typeof node === 'string') {
      return isCssInjection(node) ? null : node;
    }
    if (Array.isArray(node)) {
      return node.map((item, i) => walk(item, `${path}[${i}]`));
    }
    if (node && typeof node === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node)) {
        const cleaned = walk(v, `${path}.${k}`);
        if (cleaned !== null) out[k] = cleaned;
        else warnings.push(`${name}: removed '${path}.${k}' (suspicious CSS injection)`);
      }
      return out;
    }
    return node;
  };
  return { value: walk(value, '') as T, warnings };
}

// re-export for convenience
export { GROUPS };

// Re-export pure config merge functions from config/widget-config for backwards compatibility
export {
  computeEffectiveChatbarConfig,
  computeEffectiveBubbleConfig,
  computeEffectiveGreetWindowConfig,
  computeEffectiveChatWindowConfig,
  computeEffectiveFeaturesConfig,
} from '../config/widget-config.js';
