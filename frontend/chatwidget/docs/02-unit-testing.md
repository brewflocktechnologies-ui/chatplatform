# 2. Unit Testing

> Part of the [Chat Widget Component Library quality suite](quick-reference.md).

## 2.1 Coverage Summary

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Test files | — | **47 files** | ✅ |
| Total test cases | — | **359 tests** | ✅ |
| Test execution time | < 120s | ~26s | ✅ Pass |
| All tests passing | 100% | 359/359 | ✅ Pass |

## 2.2 Component Coverage Matrix

| Layer | Components | Test Files | Test Cases | Status |
|-------|-----------|------------|------------|--------|
| **Atoms** | 7 | 7 | 30 | ✅ 100% file coverage |
| **Molecules** | 12 | 12 | 57 | ✅ 100% file coverage |
| **Organisms** | 9 | 9 | 53 | ✅ 100% file coverage |
| **Templates** | 1 | 1 | 8 | ✅ 100% file coverage |
| **Pages** | 1 | 2 | 36 | ✅ 100% file coverage |
| **Store** | 1 | 1 | 84 | ✅ Exhaustive (1,462 lines) |
| **Config** | 3 | 3 | 11 | ✅ 100% file coverage |
| **Utils** | 6 | 6 | 51 | ✅ 100% file coverage |
| **Tokens** | 5 | 3 | 23 | ✅ Key modules covered |
| **Styles** | 2 | 2 | 2 | ✅ CSS export validation |
| **Entry** | 1 | 2 | 8 | ✅ Mount & bootstrap paths |

## 2.3 Test Quality Checks

| Check | Status | Details |
|-------|--------|---------|
| Tests cover rendering output | ✅ Pass | Shadow DOM queries verify rendered HTML structure |
| Tests cover event dispatching | ✅ Pass | Custom events (`cw:send`, `cw:toggle`, etc.) verified with listeners |
| Tests cover keyboard interactions | ✅ Pass | Enter, Escape, Space, Shift+Enter, Tab trap |
| Tests cover edge cases & error paths | ✅ Pass | Null inputs, missing configs, invalid SVGs, empty drafts |
| Tests cover async flows (timers, promises) | ✅ Pass | `vi.useFakeTimers()`, `vi.advanceTimersByTime()` for greet delays |
| Tests cover store state machine transitions | ✅ Pass | `welcome→prechat→active→postchat→closed` full lifecycle |
| Tests use proper cleanup (no leaks) | ✅ Pass | `document.body.removeChild()` in afterEach / cleanup patterns |
| No flaky tests (deterministic mocks) | ✅ Pass | `globalThis.fetch` mocked, `FileReader` mocked, timers faked |
