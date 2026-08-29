# 5. Security

> Part of the [Chat Widget Component Library quality suite](quick-reference.md).

## 5.1 XSS & Injection Protection

| Check | Status | Details |
|-------|--------|---------|
| SVG sanitization (script/event stripping) | ✅ Pass | [`sanitize-svg.ts`](file:///c:/AINATIVE/CHATPLATFORM/chatwidget_components_lit/utils/sanitize-svg.ts) strips `<script>`, `onload`, `onclick`, `javascript:`, `vbscript:`, `data:text/html`, `<foreignObject>` |
| CSS injection prevention in config tokens | ✅ Pass | [`merge.ts`](file:///c:/AINATIVE/CHATPLATFORM/chatwidget_components_lit/tokens/merge.ts) `sanitizeConfig()` strips strings with `{`, `}`, `</style>`, `</script>` |
| No `innerHTML` usage (Lit templates only) | ⚠️ Verify | Lit templates auto-escape by default; single exception — `cw-icon.ts` renders `customSvg` via `.innerHTML` (output is sanitized by `sanitize-svg.ts`) |
| Directory traversal prevention in serve-e2e | ✅ Pass | `filePath.startsWith(root)` guard in [`serve-e2e.mjs`](file:///c:/AINATIVE/CHATPLATFORM/chatwidget_components_lit/scripts/serve-e2e.mjs) |

## 5.2 Supply Chain & Dependencies

| Check | Status | Details |
|-------|--------|---------|
| Runtime dependencies | ✅ Minimal | Only `lit@^3.1.2` — zero other runtime deps |
| No known CVEs in dependencies | 🔲 TODO | Run `npm audit` regularly |
| `package-lock.json` committed | ✅ Pass | Ensures reproducible installs |
| Dev dependencies are tree-shaken from bundle | ✅ Pass | IIFE build only includes `lit` |
