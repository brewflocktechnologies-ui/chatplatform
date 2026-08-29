import { defineConfig, type Plugin } from 'vite';
import { transform } from 'esbuild';

/**
 * Minifies the CSS that lives inside `css` and `unsafeCSS("…")` literals.
 *
 * Rollup/esbuild minify JavaScript, but they never touch the *contents* of a
 * string or template literal — so every bit of indentation, comment and CRLF in
 * our stylesheets shipped verbatim (~56% of the bundle sat on those lines).
 *
 * Safety rules:
 *  - CSS is minified with esbuild's real CSS parser, never a regex, so anything
 *    it cannot parse is left exactly as-is.
 *  - `css` literals containing `${…}` interpolation are skipped entirely, so no
 *    dynamic value can be reordered or mangled.
 *  - Any failure falls back to the original source.
 */
function minifyCssLiterals(): Plugin {
  const minify = async (css: string): Promise<string | null> => {
    try {
      const out = await transform(css, { loader: 'css', minify: true });
      return out.code.trim();
    } catch {
      return null;
    }
  };

  return {
    name: 'minify-css-literals',
    enforce: 'pre',
    async transform(code, id) {
      if (!/\.ts$/.test(id) || id.includes('node_modules')) return null;
      let out = code;

      // unsafeCSS("…") — a JSON-encoded string literal
      for (const m of [...out.matchAll(/unsafeCSS\((".*?[^\\]")\)/gs)]) {
        let raw: string;
        try {
          raw = JSON.parse(m[1]);
        } catch {
          continue;
        }
        const min = await minify(raw);
        if (min) out = out.replace(m[0], `unsafeCSS(${JSON.stringify(min)})`);
      }

      // css`…` — only literals with no ${} interpolation
      for (const m of [...out.matchAll(/css`([^`$\\]*)`/g)]) {
        const min = await minify(m[1]);
        if (min) out = out.replace(m[0], 'css`' + min + '`');
      }

      return out === code ? null : out;
    },
  };
}
export default defineConfig({
  plugins: [
    minifyCssLiterals(),
  ],

  esbuild: {
    target: 'es2022',
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
    legalComments: 'none',
    drop: ['console', 'debugger'],
  },

  build: {
    target: 'es2022',
    minify: 'esbuild',
    cssMinify: true,
    reportCompressedSize: true,
    copyPublicDir: true,

    lib: {
      entry: './index.ts',
      name: 'ChatWidgetLit',
      fileName: () => 'chat-widget.js',
      formats: ['iife'],
    },

    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        compact: true,
      },
    },
  },
});
