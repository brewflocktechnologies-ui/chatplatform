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
const URI_ATTRS = new Set(['href', 'xlink:href', 'src', 'action']);
const UNSAFE_URI_PREFIXES = ['javascript:', 'data:text/html', 'vbscript:'];

// Event handlers (onclick, onload, ...), form attributes, and script/html execution URIs.
function isForbiddenAttr(name: string, value: string): boolean {
  if (FORBIDDEN_ATTR_PREFIXES.some((p) => name.startsWith(p))) return true;
  return URI_ATTRS.has(name) && UNSAFE_URI_PREFIXES.some((p) => value.startsWith(p));
}

function stripForbiddenAttrs(el: Element) {
  for (const attr of Array.from(el.attributes)) {
    if (isForbiddenAttr(attr.name.toLowerCase(), attr.value.trim().toLowerCase())) {
      el.removeAttribute(attr.name);
    }
  }
}

/** The `<svg>` root of the markup, or null when it isn't SVG. */
function parseSvgRoot(markup: string): Element | null {
  const parser = new DOMParser();
  let doc = parser.parseFromString(markup, 'image/svg+xml');

  // If XML parsing produced a parsererror, attempt HTML body wrapping fallback
  if (doc.querySelector('parsererror')) {
    const htmlDoc = parser.parseFromString(`<body>${markup}</body>`, 'text/html');
    const svgEl = htmlDoc.body.querySelector('svg');
    if (!svgEl) return null;
    doc = parser.parseFromString(svgEl.outerHTML, 'image/svg+xml');
  }

  const root = doc.querySelector('svg') || doc.documentElement;
  return root?.tagName.toLowerCase() === 'svg' ? root : null;
}

export function sanitizeSvg(rawSvg: string): string {
  if (!rawSvg || typeof rawSvg !== 'string') return '';

  const trimmed = rawSvg.trim();
  if (!trimmed) return '';

  try {
    const root = parseSvgRoot(trimmed);
    if (!root) return '';

    // The root <svg> is included in the walk.
    for (const el of [root, ...root.querySelectorAll('*')]) {
      // Disallow non-SVG tags (e.g. script, foreignObject, iframe, HTML tags)
      if (ALLOWED_SVG_TAGS.has(el.tagName.toLowerCase())) {
        stripForbiddenAttrs(el);
      } else {
        el.remove();
      }
    }

    return root.outerHTML;
  } catch {
    return '';
  }
}
