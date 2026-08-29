/**
 * utils/sanitize-svg.ts
 * Sanitizes untrusted SVG strings to prevent XSS attacks when using .innerHTML.
 * Strips script tags, event handlers (on*), javascript: URIs, foreignObject, and non-SVG elements.
 */

const ALLOWED_SVG_TAGS = new Set([
  'svg',
  'g',
  'path',
  'circle',
  'line',
  'polyline',
  'polygon',
  'rect',
  'ellipse',
  'defs',
  'use',
  'clippath',
  'lineargradient',
  'radialgradient',
  'stop',
  'title',
  'desc',
  'mask',
  'text',
  'tspan',
  'symbol',
  'marker',
  'pattern',
  'style',
]);

const FORBIDDEN_ATTR_PREFIXES = ['on', 'form'];

export function sanitizeSvg(rawSvg: string): string {
  if (!rawSvg || typeof rawSvg !== 'string') return '';

  const trimmed = rawSvg.trim();
  if (!trimmed) return '';

  try {
    const parser = new DOMParser();
    let doc = parser.parseFromString(trimmed, 'image/svg+xml');

    // If XML parsing produced a parsererror, attempt HTML body wrapping fallback
    if (doc.querySelector('parsererror')) {
      const htmlDoc = parser.parseFromString(`<body>${trimmed}</body>`, 'text/html');
      const svgEl = htmlDoc.body.querySelector('svg');
      if (!svgEl) return '';
      doc = parser.parseFromString(svgEl.outerHTML, 'image/svg+xml');
    }

    const root = doc.querySelector('svg') || doc.documentElement;
    if (!root || root.tagName.toLowerCase() !== 'svg') {
      return '';
    }

    const allElements = Array.from(root.querySelectorAll('*'));
    allElements.unshift(root); // include root <svg>

    for (const el of allElements) {
      const tagName = el.tagName.toLowerCase();

      // Disallow non-SVG tags (e.g. script, foreignObject, iframe, HTML tags)
      if (!ALLOWED_SVG_TAGS.has(tagName)) {
        el.remove();
        continue;
      }

      // Sanitize all attributes
      const attrs = Array.from(el.attributes);
      for (const attr of attrs) {
        const name = attr.name.toLowerCase();
        const value = attr.value.trim().toLowerCase();

        // 1. Remove event handlers (onclick, onload, etc.) and form attributes
        if (FORBIDDEN_ATTR_PREFIXES.some((p) => name.startsWith(p))) {
          el.removeAttribute(attr.name);
          continue;
        }

        // 2. Remove script/html execution URIs in href, xlink:href, src, etc.
        if (
          (name === 'href' || name === 'xlink:href' || name === 'src' || name === 'action') &&
          (value.startsWith('javascript:') || value.startsWith('data:text/html') || value.startsWith('vbscript:'))
        ) {
          el.removeAttribute(attr.name);
          continue;
        }
      }
    }

    return root.outerHTML;
  } catch {
    return '';
  }
}
