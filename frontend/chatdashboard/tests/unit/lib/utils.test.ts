import { describe, expect, it } from 'vitest';
import { cn, formatBytes, randomFraction, randomId } from '@/lib/utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('drops falsy values', () => {
    const isHidden = Boolean(process.env.NEVER_SET);
    expect(cn('px-2', isHidden && 'hidden', undefined, null)).toBe('px-2');
  });

  it('lets later tailwind classes win over conflicting ones', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});

describe('randomFraction', () => {
  it('returns values in [0, 1)', () => {
    for (let i = 0; i < 50; i++) {
      const value = randomFraction();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('randomId', () => {
  it('returns six base36 characters by default', () => {
    expect(randomId()).toMatch(/^[0-9a-z]{6}$/);
  });

  it('respects a custom length', () => {
    expect(randomId(4)).toMatch(/^[0-9a-z]{4}$/);
    expect(randomId(12)).toMatch(/^[0-9a-z]{12}$/);
  });

  it('produces distinct ids across calls', () => {
    const ids = new Set(Array.from({ length: 20 }, () => randomId(12)));
    expect(ids.size).toBe(20);
  });
});

describe('formatBytes', () => {
  it('returns "0 Byte" for zero', () => {
    expect(formatBytes(0)).toBe('0 Byte');
  });

  it('formats bytes below 1 KB', () => {
    expect(formatBytes(512)).toBe('512 Bytes');
  });

  it('formats kilobytes with default decimals', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('respects the decimals option', () => {
    expect(formatBytes(1536, { decimals: 1 })).toBe('1.5 KB');
  });

  it('uses binary units when sizeType is accurate', () => {
    expect(formatBytes(1048576, { sizeType: 'accurate' })).toBe('1 MiB');
  });
});
