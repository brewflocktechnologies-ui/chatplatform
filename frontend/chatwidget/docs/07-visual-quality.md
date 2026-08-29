# 7. Visual Quality

> Part of the [Chat Widget Component Library quality suite](quick-reference.md).

## 7.1 Visual Regression Baselines

| State | Baseline Screenshot | Browser | Status |
|-------|-------------------|---------|--------|
| Bubble idle | `bubble-idle.png` | Chromium | ✅ Tracked |
| Welcome card open | `welcome-open.png` | Chromium | ✅ Tracked |
| Prechat form | `prechat-form.png` | Chromium | ✅ Tracked |
| Active chat with message | `active-chat.png` | Chromium | ✅ Tracked |

## 7.2 Responsive Design

| Viewport | Behavior | Status |
|----------|----------|--------|
| Desktop (> 480px) | Floating panel with configured dimensions | ✅ Pass |
| Mobile (≤ 480px) | Full-screen `calc(100vw - 24px)` × `calc(100vh - 24px)` | ✅ Pass |
| iPhone 13 (390×844) | Panel caps to viewport, touch-friendly | ✅ Pass |

## 7.3 Theming

| Check | Status | Details |
|-------|--------|---------|
| 5 client theme configs tested | ✅ Pass | `amber`, `default`, `emerald`, `google`, `phonepe` |
| Host CSS variable inheritance | ✅ Pass | `--primary-color`, `--secondary-color` from host page |
| Dark mode reactive switching | ✅ Pass | `MutationObserver` on `document.documentElement` `.dark` class |
| `data-accent` attribute override | ✅ Pass | Script tag attribute takes precedence |
| Dynamic `color-mix()` derived colors | ✅ Pass | `--cw-accent-deep`, `--cw-accent-soft`, `--cw-accent-tint` |
