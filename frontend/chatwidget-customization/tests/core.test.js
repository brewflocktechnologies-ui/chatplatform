import { describe, it, expect, beforeAll } from 'vitest';

// core.js is a classic script that attaches CWCore to the global object;
// importing it as a module runs the IIFE.
beforeAll(async () => {
  await import('../src/core.js');
});

const core = () => globalThis.CWCore;

describe('CWCore.isPlainObject', () => {
  it('accepts plain objects', () => {
    expect(core().isPlainObject({})).toBe(true);
    expect(core().isPlainObject({ a: 1 })).toBe(true);
  });

  it('rejects arrays, null, primitives and functions', () => {
    expect(core().isPlainObject([])).toBe(false);
    expect(core().isPlainObject(null)).toBe(false);
    expect(core().isPlainObject('x')).toBe(false);
    expect(core().isPlainObject(42)).toBe(false);
    expect(core().isPlainObject(undefined)).toBe(false);
  });
});

describe('CWCore.unwrapCdnConfig', () => {
  it('returns a bare config unchanged', () => {
    const cfg = { clientId: 'amber' };
    expect(core().unwrapCdnConfig(cfg)).toBe(cfg);
  });

  it('unwraps a single cdnConfig envelope', () => {
    const inner = { clientId: 'amber' };
    expect(core().unwrapCdnConfig({ cdnConfig: inner })).toBe(inner);
  });

  it('unwraps multiple nested envelopes (as produced by repeated saves)', () => {
    const inner = { clientId: 'amber' };
    const wrapped = { cdnConfig: { cdnConfig: { cdnConfig: inner } } };
    expect(core().unwrapCdnConfig(wrapped)).toBe(inner);
  });

  it('stops at an array-valued cdnConfig instead of unwrapping into it', () => {
    const cfg = { cdnConfig: [1, 2, 3] };
    expect(core().unwrapCdnConfig(cfg)).toBe(cfg);
  });

  it('passes through null/undefined/primitives', () => {
    expect(core().unwrapCdnConfig(null)).toBe(null);
    expect(core().unwrapCdnConfig(undefined)).toBe(undefined);
    expect(core().unwrapCdnConfig('str')).toBe('str');
  });

  it('terminates on a self-referencing envelope (depth cap)', () => {
    const evil = {};
    evil.cdnConfig = evil;
    // Must not hang; result is still the (only) object.
    expect(core().unwrapCdnConfig(evil)).toBe(evil);
  });
});

describe('CWCore.escapeHtml', () => {
  it('escapes all HTML-significant characters', () => {
    expect(core().escapeHtml(`<img src=x onerror=alert(1)>"'&`))
      .toBe('&lt;img src=x onerror=alert(1)&gt;&quot;&#39;&amp;');
  });

  it('renders a script-injection payload inert inside markup', () => {
    const payload = '</option></select><script>window.pwned=1</script>';
    const escaped = core().escapeHtml(payload);
    expect(escaped).not.toContain('<');
    expect(escaped).not.toContain('>');
  });

  it('stringifies non-strings and maps null/undefined to empty string', () => {
    expect(core().escapeHtml(42)).toBe('42');
    expect(core().escapeHtml(null)).toBe('');
    expect(core().escapeHtml(undefined)).toBe('');
  });
});

describe('CWCore.normalizeOrigin', () => {
  it('lowercases and strips trailing slashes', () => {
    expect(core().normalizeOrigin('HTTPS://Example.COM/')).toBe('https://example.com');
    expect(core().normalizeOrigin('https://a.dev///')).toBe('https://a.dev');
  });

  it('maps falsy input to empty string', () => {
    expect(core().normalizeOrigin('')).toBe('');
    expect(core().normalizeOrigin(null)).toBe('');
  });
});

describe('CWCore.validateWidgetConfig', () => {
  const valid = {
    clientId: 'amber',
    clientName: 'Amber Corp',
    accentColor: '#f59e0b',
    useWebsiteTheme: false,
    features: { attachments: true },
    bubble: { size: 56 },
    chatWindow: { title: 'Chat with us' },
    messages: [{ key: 'welcome', body: 'Hi!' }]
  };

  it('accepts a well-formed config', () => {
    const res = core().validateWidgetConfig(valid);
    expect(res.ok).toBe(true);
    expect(res.errors).toEqual([]);
  });

  it('is permissive about unknown keys (schema evolves)', () => {
    const res = core().validateWidgetConfig({ ...valid, futureSection: { x: 1 } });
    expect(res.ok).toBe(true);
  });

  it('rejects non-objects', () => {
    for (const bad of [null, undefined, [], 'cfg', 42, true]) {
      expect(core().validateWidgetConfig(bad).ok).toBe(false);
    }
  });

  it('rejects an empty config', () => {
    expect(core().validateWidgetConfig({}).ok).toBe(false);
  });

  it('rejects wrong-typed known sections with a descriptive error', () => {
    const res = core().validateWidgetConfig({ clientId: 42, bubble: 'round', messages: {} });
    expect(res.ok).toBe(false);
    expect(res.errors.join(' ')).toMatch(/"clientId" must be string/);
    expect(res.errors.join(' ')).toMatch(/"bubble" must be object/);
    expect(res.errors.join(' ')).toMatch(/"messages" must be array/);
  });

  it('rejects prototype-pollution vectors at any depth', () => {
    const res = core().validateWidgetConfig({
      clientId: 'x',
      chatWindow: { nested: JSON.parse('{"__proto__": {"polluted": true}}') }
    });
    expect(res.ok).toBe(false);
    expect(res.errors.join(' ')).toContain('__proto__');

    const res2 = core().validateWidgetConfig({
      clientId: 'x',
      features: { constructor: { prototype: {} } }
    });
    expect(res2.ok).toBe(false);
  });

  it('rejects configs nested beyond the depth cap', () => {
    let deep = { end: true };
    for (let i = 0; i < 40; i++) deep = { next: deep };
    const res = core().validateWidgetConfig({ clientId: 'x', extra: deep });
    expect(res.ok).toBe(false);
    expect(res.errors.join(' ')).toMatch(/nesting depth/);
  });
});
