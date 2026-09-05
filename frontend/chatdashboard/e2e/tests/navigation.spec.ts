import { expect, test } from '@playwright/test';
import { DashboardShell } from '../support/pages/dashboard-shell';

/**
 * Dashboard shell workflows: sidebar navigation across every product surface
 * in nav-config.ts, the kbar command palette, root redirects, and theming.
 * Runs with the shared authenticated agent state.
 */

const NAV_ITEMS: { title: string; path: string }[] = [
  { title: 'Dashboard', path: '/dashboard/overview' },
  { title: 'Workspaces', path: '/dashboard/workspaces' },
  { title: 'Customers', path: '/dashboard/customers' },
  { title: 'Websites', path: '/dashboard/websites' },
  { title: 'Widget Modifier', path: '/dashboard/widget-modifier' },
  { title: 'Chat', path: '/dashboard/chat' },
  { title: 'AI Chat', path: '/dashboard/ai-chat' }
];

test.describe('Navigation', () => {
  test('root URL routes signed-in users to the overview', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/dashboard/overview');
  });

  test('/dashboard redirects to the overview', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL('**/dashboard/overview');
  });

  test('sidebar reaches every product surface', async ({ page }) => {
    // Under full-suite parallel load the Next.js dev server may take well over
    // 60 s to compile every route on first access.  Triple the timeout (→ 180 s)
    // and pre-warm every nav route via a background fetch so compilation is
    // already done before the sidebar clicks start.
    test.slow();

    // Fire fetches concurrently — we only need the server to compile each
    // route, we do not need the response bodies.
    await Promise.all(
      NAV_ITEMS.map(({ path }) =>
        page.request.fetch(path, { timeout: 120_000 }).catch(() => null)
      )
    );

    const shell = new DashboardShell(page);
    await page.goto('/dashboard/overview');

    for (const item of NAV_ITEMS) {
      await shell.navigateTo(item.title, item.path);
      await expect(page).toHaveURL(new RegExp(item.path.replace(/\//g, '\\/')));
      // The active item is highlighted in the sidebar (boolean data attribute).
      await expect(shell.navLink(item.title).and(page.locator('[data-active]'))).toBeVisible();
    }
  });

  test('kbar command palette navigates by search', async ({ page }) => {
    test.slow();
    const shell = new DashboardShell(page);
    await page.goto('/dashboard/overview');

    const kbarInput = await shell.openKbar();
    await kbarInput.fill('Websites');
    const result = page.getByText('Go to Websites');
    await expect(result).toBeVisible();
    await result.click();

    await page.waitForURL('**/dashboard/websites', { waitUntil: 'commit' });
  });

  test('theme mode toggle switches between light and dark', async ({ page }) => {
    await page.goto('/dashboard/overview');
    const html = page.locator('html');
    const wasDark = (await html.getAttribute('class'))?.includes('dark') ?? false;

    await page.getByRole('button', { name: 'Toggle theme' }).click();
    if (wasDark) {
      await expect(html).not.toHaveClass(/dark/);
    } else {
      await expect(html).toHaveClass(/dark/);
    }

    // Toggle back so the shared state stays deterministic for other tests.
    await page.getByRole('button', { name: 'Toggle theme' }).click();
    if (wasDark) {
      await expect(html).toHaveClass(/dark/);
    } else {
      await expect(html).not.toHaveClass(/dark/);
    }
  });

  test('user menu exposes profile, billing, notifications and sign out', async ({ page }) => {
    const shell = new DashboardShell(page);
    await page.goto('/dashboard/overview');
    await shell.openUserMenu();

    for (const item of ['Profile', 'Billing', 'Notifications', 'Sign out']) {
      await expect(page.getByRole('menuitem', { name: item })).toBeVisible();
    }
    await page.keyboard.press('Escape');
  });
});
