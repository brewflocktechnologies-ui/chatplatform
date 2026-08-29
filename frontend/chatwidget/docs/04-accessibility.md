# 4. Accessibility (a11y)

> Part of the [Chat Widget Component Library quality suite](quick-reference.md).

## 4.1 Automated Checks

| Check | Status | Details |
|-------|--------|---------|
| Axe-core automated audits (serious/critical) | ✅ Pass | 3 key states scanned via `@axe-core/playwright` |
| Shadow DOM traversal in audits | ✅ Pass | Full `<cw-widget-root>` tree scanned |
| `prefers-reduced-motion` support | ✅ Pass | Global `@media (prefers-reduced-motion: reduce)` forces `0.01ms` durations |
| `REDUCED_MOTION_CSS` token available | ✅ Pass | Forces `0.01ms` durations for motion-sensitive users |

## 4.2 Keyboard Navigation

| Check | Status | Details |
|-------|--------|---------|
| Escape key closes panel/dialog | ✅ Pass | Fixed to use `window.addEventListener` for cross-browser reliability |
| Tab focus trapping inside open panel | ✅ Pass | First↔Last element wrapping across Shadow DOM boundaries |
| Enter/Space activates launcher triggers | ✅ Pass | Bubble and chatbar both respond to keyboard activation |
| Focus returns to launcher on panel close | ✅ Pass | `cw-widget-root` manages launcher focus restoration |

## 4.3 Manual Verification Checklist

| Check | Status | Details |
|-------|--------|---------|
| Screen reader announces widget state changes | 🔲 TODO | Verify with NVDA/VoiceOver — add `aria-live` regions for new messages |
| Color contrast ratios meet WCAG AA (4.5:1) | 🔲 TODO | Audit all 5 client themes with contrast checker tools |
| Form inputs have associated `<label>` elements | ✅ Pass | `cw-form-field` renders labels with proper association |
| Interactive elements have accessible names | ✅ Pass | Buttons include `aria-label` fallbacks |
| Focus indicators are visible | ⚠️ Verify | Ensure custom focus rings are visible against all theme backgrounds |
