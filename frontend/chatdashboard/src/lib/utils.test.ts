import { describe, expect, it } from 'vitest';
import { cn, formatBytes } from '@/lib/utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('drops falsy values', () => {
    expect(cn('px-2', false && 'hidden', undefined, null)).toBe('px-2');
  });

  it('lets later tailwind classes win over conflicting ones', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
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
