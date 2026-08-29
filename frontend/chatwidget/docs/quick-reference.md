# Chat Widget Component Library — Quality & Performance Checklist

> A comprehensive quality gate and performance measurement framework for `chatwidget-components-lit`.
> Covers code health, testing, accessibility, security, bundle performance, CI/CD, and operational readiness.

## Document Index

| # | File | Focus |
|---|------|-------|
| 1 | [01-code-quality.md](01-code-quality.md) | Structure, types, patterns |
| 2 | [02-unit-testing.md](02-unit-testing.md) | Vitest coverage & assertions |
| 3 | [03-e2e-testing.md](03-e2e-testing.md) | Playwright cross-browser validation |
| 4 | [04-accessibility.md](04-accessibility.md) | WCAG compliance & assistive tech |
| 5 | [05-security.md](05-security.md) | XSS, injection, input sanitization |
| 6 | [06-bundle-performance.md](06-bundle-performance.md) | Size, load time, runtime efficiency |
| 7 | [07-visual-quality.md](07-visual-quality.md) | Regression, responsiveness, theming |
| 8 | [08-cicd.md](08-cicd.md) | Build speed, caching, reliability |
| 9 | [09-documentation-dx.md](09-documentation-dx.md) | Storybook, types, onboarding |
| 10 | [10-operations.md](10-operations.md) | Resilience, monitoring, deployment |

## Quick Reference: Running the Full Quality Suite

```bash
# 1. Unit tests
npm run test

# 2. Unit tests with coverage report
npm run test:coverage

# 3. Build production bundle
npm run build

# 4. E2E tests (Chromium only, fast)
npm run test:e2e

# 5. E2E tests (all browsers + mobile)
npm run test:e2e:all

# 6. Update visual regression baselines
npm run test:e2e:update

# 7. Interactive E2E debugging
npm run test:e2e:ui

# 8. Storybook development
npm run storybook

# 9. Build Storybook for deployment
npm run build-storybook
```

---

> **Last updated**: August 19, 2026
> **Library version**: 1.0.0
> **Components**: 30 Lit Web Components (7 atoms, 12 molecules, 9 organisms, 1 template, 1 page)
> **Test suite**: 387 tests (359 unit + 28 E2E)
> **Bundle**: 245.3 KB raw / 57.8 KB gzipped (single IIFE, 1 dependency)
