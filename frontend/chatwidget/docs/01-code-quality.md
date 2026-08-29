# 1. Code Quality & Architecture

> Part of the [Chat Widget Component Library quality suite](quick-reference.md).

## 1.1 Atomic Design Compliance

| Check | Status | Details |
|-------|--------|---------|
| Atoms are pure presentational (zero store coupling) | ✅ Pass | 7 atoms (`cw-icon`, `cw-badge`, `cw-button`, `cw-tooltip`, `cw-status-dot`, `cw-typing-dots`, `cw-menu-item`) — all stateless |
| Molecules compose atoms without store imports | ✅ Pass | 12 molecules — none import `chat-store.ts` directly |
| Organisms handle domain logic and events | ✅ Pass | 9 organisms — dispatch domain events (`cw:toggle`, `cw:send`, etc.) |
| Templates handle layout only (slot-based) | ✅ Pass | 1 template (`cw-widget-layout`) — pure slot projection with geometry math |
| Pages wire store ↔ template | ✅ Pass | 1 page (`cw-widget-root`, 644 lines) — single orchestration root |
| No circular dependencies between layers | ✅ Pass | Atoms→Molecules→Organisms→Templates→Pages (strict unidirectional) |

## 1.2 TypeScript Strictness

| Check | Status | Details |
|-------|--------|---------|
| `strict: true` in tsconfig | ✅ Pass | Full strict mode enabled |
| No unjustified any usage | ⚠️ Verify | Audit any in store/utils and document or replace any unavoidable cases |
| `store/types.ts` is pure types (no runtime) | ✅ Pass | 400 lines of pure interfaces/types, zero side effects |
| Declaration files generated (`*.d.ts`) | ✅ Pass | `declaration: true` in tsconfig |
| ES2022 target for modern syntax | ✅ Pass | Native class fields, optional chaining, nullish coalescing |

## 1.3 Component Architecture

| Check | Status | Details |
|-------|--------|---------|
| All 30 components are registered as custom elements | ✅ Pass | Auto-registered via `index.ts` |
| Shadow DOM encapsulation | ✅ Pass | All components use Lit's shadow DOM |
| Reactive properties use `@property()` decorators | ✅ Pass | Consistent across all components |
| Event naming follows `cw:*` convention | ✅ Pass | 25+ custom events (e.g. `cw:toggle`, `cw:send`, `cw:draft-change`) |
| Cleanup in `disconnectedCallback` | ✅ Pass | Event listeners, subscriptions, and observers torn down properly |
| No direct DOM manipulation outside Shadow DOM | ✅ Pass | Only `ensureTokenCss()` injects into `<head>` (design tokens) |

## 1.4 Store Architecture

| Check | Status | Details |
|-------|--------|---------|
| Centralized reactive store (`EventTarget` emitter) | ✅ Pass | Granular events: `store:bubble`, `store:chat`, etc. |
| Micro-subscription model (no full re-renders) | ⚠️ Gap | Granular events exist (`subscribe(event, cb)`), but the page uses `subscribeAll` + a `rev` counter → the full widget tree re-renders on every store emit (see §6.3 known optimization) |
| Store is a module-level singleton | ✅ Pass | Global store in `chat-store.ts` — shared by all widget instances on the page (not per-instance) |
| Async initialization with `whenStoreReady()` | ✅ Pass | Promise-based hydration gate |
| Store exports serialization (`exportFullStoreConfig`) | ✅ Pass | Full JSON round-trip for token hydration |
