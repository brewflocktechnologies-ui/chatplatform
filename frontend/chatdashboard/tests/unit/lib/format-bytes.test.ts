import { describe, expect, it } from 'vitest';
import { formatBytes } from '@/lib/utils';

describe('formatBytes edge cases', () => {
  it('handles zero', () => {
    expect(formatBytes(0)).toBe('0 Byte');
  });
  it('uses decimals and accurate size names', () => {
    expect(formatBytes(1536, { decimals: 1 })).toBe('1.5 KB');
    expect(formatBytes(1536, { decimals: 1, sizeType: 'accurate' })).toBe('1.5 KiB');
  });
  it('falls back for sizes beyond the table', () => {
    const huge = 1024 ** 6;
    expect(formatBytes(huge)).toMatch(/Bytes$/);
    expect(formatBytes(huge, { sizeType: 'accurate' })).toMatch(/Bytest$/);
  });
});
