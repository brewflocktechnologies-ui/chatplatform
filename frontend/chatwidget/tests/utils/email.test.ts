import { describe, expect, it } from 'vitest';
import { isValidEmail } from '../../utils/email.js';

// The behaviour this replaced: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const legacy = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

describe('isValidEmail', () => {
  it('accepts ordinary addresses', () => {
    for (const v of ['john@example.com', 'a@b.co', 'first.last+tag@sub.example.org', 'x@y.z.w']) {
      expect(isValidEmail(v)).toBe(true);
    }
  });

  it('rejects values without a usable @', () => {
    for (const v of ['', 'plain', '@example.com', 'john@', 'a@@b.com', 'a@b@c.com']) {
      expect(isValidEmail(v)).toBe(false);
    }
  });

  it('rejects domains without an inner dot', () => {
    for (const v of ['john@example', 'john@.com', 'john@example.', 'john@.']) {
      expect(isValidEmail(v)).toBe(false);
    }
  });

  it('rejects any whitespace', () => {
    for (const v of [' john@example.com', 'john@example.com ', 'jo hn@example.com', 'john@exa mple.com', 'john@example.com\n']) {
      expect(isValidEmail(v)).toBe(false);
    }
  });

  it('accepts exactly what the previous regex accepted', () => {
    const samples = [
      'a@b.c', 'a@b.c.', 'a@.b.c', 'a@b..c', 'a@..', 'a@...', 'a@b.', 'a@.b', '@a.b', 'a@b',
      'a b@c.d', 'a@b c.d', 'a@b.c d', 'a@b.c@d', '', '@', 'a@', 'ab@cd.ef', 'a.b@c.d.e'
    ];
    for (const v of samples) {
      expect(isValidEmail(v), JSON.stringify(v)).toBe(legacy.test(v));
    }
  });

  it('stays fast on a crafted value that makes the old regex backtrack', () => {
    const hostile = 'a@' + '.'.repeat(50_000) + ' ';
    const started = performance.now();
    expect(isValidEmail(hostile)).toBe(false);
    expect(performance.now() - started).toBeLessThan(200);
  });
});
