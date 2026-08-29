# 8. CI/CD Pipeline

> Part of the [Chat Widget Component Library quality suite](quick-reference.md).

## 8.1 CI Workflow ([`ci.yml`](file:///c:/AINATIVE/CHATPLATFORM/.github/workflows/ci.yml))

| Check | Status | Details |
|-------|--------|---------|
| Unit tests in CI | ✅ Pass | `unit` job runs `npm run test` in `chatwidget_components_lit` |
| Concurrency group cancels stale runs | ✅ Pass | `cancel-in-progress: true` |
| npm cache enabled | ✅ Pass | `cache: npm` with `cache-dependency-path` |
| Build job in CI | ❌ Gap | No `build` job — bundle is built only during deploy |
| E2E job in CI (4 browsers) | ❌ Gap | No `e2e` job — Playwright runs locally only (§3 results are local) |
| Playwright browser cache | ❌ Gap | No `actions/cache` on `~/.cache/ms-playwright` |
| Build artifact upload | ❌ Gap | No `actions/upload-artifact`; deploy rebuilds from `head_sha` |
| E2E report upload on failure | ❌ Gap | No `playwright-report/` / `test-results/` artifacts |

## 8.2 Deploy Workflow ([`deploy.yml`](file:///c:/AINATIVE/CHATPLATFORM/.github/workflows/deploy.yml))

| Check | Status | Details |
|-------|--------|---------|
| Triggers only on CI success | ✅ Pass | `workflow_run.conclusion == 'success'` |
| Deploys validated commit SHA | ✅ Pass | `ref: github.event.workflow_run.head_sha` |
| Storybook + widget + test page deployed | ✅ Pass | All copied to `storybook-static/` |
| GitHub Pages deployment | ✅ Pass | `actions/deploy-pages@v4` |

## 8.3 CI Performance Targets

| Metric | Target | Actual/Estimated | Status |
|--------|--------|------------------|--------|
| Unit tests (wall clock) | < 2 min | ~26s (local) | ✅ |
| Build job | < 1 min | ~30s | ⚠️ Not in CI — add |
| E2E tests (4 browsers) | < 5 min | ~3.5 min | ⚠️ Not in CI — add |
| **Total CI wall clock** | **< 5 min** | unit-only today | ⚠️ Depends on the missing jobs above |
