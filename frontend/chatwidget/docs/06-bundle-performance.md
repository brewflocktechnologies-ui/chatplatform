# 6. Bundle Performance

> Part of the [Chat Widget Component Library quality suite](quick-reference.md).

## 6.1 Bundle Size Metrics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| **Production bundle** (`chat-widget.js`) | **245.3 KB** raw | < 300 KB | ✅ Pass |
| **Gzipped bundle** | **57.8 KB** gzip | < 75 KB | ✅ Pass |
| **Runtime dependencies** | 1 (`lit`) | ≤ 2 | ✅ Pass |
| **CSS in bundle** (via `unsafeCSS`) | Minified at build | — | ✅ Custom Vite plugin |
| **Legacy dashboard CSS excluded from JS** | 76.7 KB saved | — | ✅ Not re-exported via `index.ts`; caveat — legacy `public/style.css` (70.1 KB) still ships to `dist/` via Vite `copyPublicDir` |

## 6.2 Build Speed

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| `tsc && vite build` | **~2.5s** | < 10s | ✅ Pass |
| Modules transformed | 66 | — | ✅ |
| Build output | Single IIFE file | — | ✅ Zero chunk loading latency |

## 6.3 Runtime Performance Optimizations

| Optimization | Status | Details |
|-------------|--------|---------|
| Zero external runtime frameworks (beyond Lit) | ✅ | No React/Vue/jQuery overhead |
| Inlined SVG icons (no icon font/sprite network requests) | ✅ | ~25 Lucide icons in `cw-icon.ts` switch map |
| Single-pass token CSS injection (`<style id="cw-token-css">`) | ✅ | Tokens injected once into `<head>`, inherited by all Shadow DOMs |
| Hardware acceleration on panel (`transform: translateZ(0)`) | ✅ | Separate compositing layer for panel animations |
| Custom RAF-based transition controller | ✅ | [`EnterLeaveController`](file:///c:/AINATIVE/CHATPLATFORM/chatwidget_components_lit/utils/transition.ts) — avoids heavy animation libraries |
| CSS custom properties for theming (no re-paint) | ✅ | All `--cw-*` variables, `color-mix()` for derived colors |
| `console.*` and `debugger` dropped at build | ✅ | Via esbuild `drop` config |
| CSS template literals minified at build | ✅ | Custom `minifyCssLiterals` Vite plugin |
| `inlineDynamicImports: true` | ✅ | No chunk loading network latency |
| Scroll-to-bottom optimized (revision-based) | ✅ | Only scrolls on state `rev` change, not every render |

> **Known optimization**: full widget tree re-renders on every store emit (`subscribeAll` + `rev` counter) — see [01-code-quality.md](01-code-quality.md) §1.4.

## 6.4 Performance Measurement Commands

```bash
# Build and check bundle size
npm run build
ls -lh dist/chat-widget.js

# Check gzipped size
gzip -c dist/chat-widget.js | wc -c

# Analyze bundle composition (add to vite.config.ts temporarily)
# npm install -D rollup-plugin-visualizer
# import { visualizer } from 'rollup-plugin-visualizer'
# plugins: [visualizer({ open: true })]

# Lighthouse audit (run against deployed Storybook or test.html)
npx lighthouse https://your-pages-url/test.html --only-categories=performance
```
