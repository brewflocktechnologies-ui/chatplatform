import { describe, it, expect, vi } from 'vitest';
import { sanitizeSvg } from '../../utils/sanitize-svg.js';

describe('sanitizeSvg utility', () => {
  it('returns empty string for empty or non-string inputs', () => {
    expect(sanitizeSvg('')).toBe('');
    expect(sanitizeSvg('   ')).toBe('');
    expect(sanitizeSvg(null as unknown as string)).toBe('');
    expect(sanitizeSvg(undefined as unknown as string)).toBe('');
  });

  it('preserves clean, valid SVG markup', () => {
    const validSvg = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle></svg>';
    const cleaned = sanitizeSvg(validSvg);
    expect(cleaned).toContain('<svg');
    expect(cleaned).toContain('<circle');
    expect(cleaned).toContain('cx="12"');
  });

  it('strips script tags and inline handlers', () => {
    const maliciousSvg = '<svg onload="alert(1)"><script>alert(2)</script><rect x="0" y="0" width="10" height="10" onclick="alert(3)"></rect></svg>';
    const cleaned = sanitizeSvg(maliciousSvg);
    expect(cleaned).not.toContain('<script');
    expect(cleaned).not.toContain('onload');
    expect(cleaned).not.toContain('onclick');
    expect(cleaned).toContain('<rect');
  });

  it('strips javascript:, data:text/html, and vbscript: URIs in href, xlink:href, src, and action attributes', () => {
    const maliciousSvg = `
      <svg>
        <a href="javascript:alert(1)">
          <use xlink:href="vbscript:msgbox(1)" src="data:text/html;base64,123" action="javascript:evil()"></use>
        </a>
      </svg>
    `;
    const cleaned = sanitizeSvg(maliciousSvg);
    expect(cleaned).not.toContain('javascript:');
    expect(cleaned).not.toContain('vbscript:');
    expect(cleaned).not.toContain('data:text/html');
  });

  it('strips foreignObject and non-SVG elements', () => {
    const maliciousSvg = '<svg><foreignObject><iframe></iframe><p>text</p></foreignObject></svg>';
    const cleaned = sanitizeSvg(maliciousSvg);
    expect(cleaned).not.toContain('<foreignObject');
    expect(cleaned).not.toContain('<iframe');
    expect(cleaned).not.toContain('<p');
  });

  it('handles XML parsererror by parsing HTML body fallback', () => {
    // Unclosed tag in strict XML produces parsererror, forcing HTML body fallback
    const malformedXmlSvg = '<svg><circle cx="5" cy="5" r="5"></svg>';
    const cleaned = sanitizeSvg(malformedXmlSvg);
    expect(cleaned).toContain('<svg');
    expect(cleaned).toContain('<circle');

    // Malformed string that doesn't produce an svg element in fallback
    expect(sanitizeSvg('<parsererror></parsererror>')).toBe('');
  });

  it('returns empty string when root element is not an SVG tag', () => {
    expect(sanitizeSvg('<g><path d="M0 0"></path></g>')).toBe('');
  });

  it('catches and handles exceptions thrown during parsing', () => {
    const originalDOMParser = globalThis.DOMParser;
    globalThis.DOMParser = vi.fn().mockImplementation(() => {
      throw new Error('Parser crash');
    });

    expect(sanitizeSvg('<svg></svg>')).toBe('');

    globalThis.DOMParser = originalDOMParser;
  });
});
