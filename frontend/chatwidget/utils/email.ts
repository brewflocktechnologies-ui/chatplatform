/**
 * Lenient email check: one `@`, no whitespace, a non-empty local part, and a
 * domain with a dot that has at least one character on each side.
 *
 * Written without a backtracking regex on purpose: the equivalent
 * `^[^\s@]+@[^\s@]+\.[^\s@]+$` takes quadratic time on a crafted value with many
 * dots and no valid ending. This version is a single linear pass.
 */
export function isValidEmail(value: string): boolean {
  if (/\s/.test(value)) return false;

  const at = value.indexOf('@');
  if (at < 1 || value.includes('@', at + 1)) return false;

  const domain = value.slice(at + 1);
  // A dot strictly inside the domain: something before it and something after it.
  return domain.slice(1, -1).includes('.');
}
