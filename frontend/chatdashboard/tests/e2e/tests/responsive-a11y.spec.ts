import { expect, test } from '../support/fixtures';

/**
 * Responsive shell behaviour (mobile sidebar sheet, desktop collapse) and
 * cheap keyboard / accessibility checks. No backend data is involved.
 */

test.describe('Mobile viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('sidebar is hidden by default and opens as a sheet from the trigger', async ({ page }) => {
    await page.goto('/dashboard/overview');
    await expect(page.getByRole('button', { name: 'Toggle Sidebar' }).first()).toBeVisible();

    // Desktop sidebar is not rendered below the md breakpoint.
    await expect(page.locator('[data-slot="sidebar"][data-mobile="true"]')).toHaveCount(0);

    await page.getByRole('button', { name: 'Toggle Sidebar' }).first().click();
    const mobileSidebar = page.locator('[data-slot="sidebar"][data-mobile="true"]');
    await expect(mobileSidebar).toBeVisible();
    for (const title of ['Dashboard', 'Customers', 'Websites', 'Chat', 'Archives']) {
      await expect(mobileSidebar.getByRole('link', { name: title, exact: true })).toBeVisible();
    }
  });

  test('choosing a link in the mobile sidebar navigates there', async ({ page }) => {
    test.slow();
    await page.goto('/dashboard/overview');
    await page.getByRole('button', { name: 'Toggle Sidebar' }).first().click();

    const mobileSidebar = page.locator('[data-slot="sidebar"][data-mobile="true"]');
    await mobileSidebar.getByRole('link', { name: 'Customers', exact: true }).click();
    await page.waitForURL('**/dashboard/customers', { waitUntil: 'commit' });
  });

  test('the mobile sidebar closes on Escape', async ({ page }) => {
    await page.goto('/dashboard/overview');
    await page.getByRole('button', { name: 'Toggle Sidebar' }).first().click();
    const mobileSidebar = page.locator('[data-slot="sidebar"][data-mobile="true"]');
    await expect(mobileSidebar).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(mobileSidebar).toHaveCount(0);
  });

  test('page content does not overflow horizontally', async ({ page }) => {
    for (const path of ['/dashboard/overview', '/dashboard/exclusive', '/dashboard/workspaces']) {
      await page.goto(path);
      await expect(page.getByRole('button', { name: 'Toggle Sidebar' }).first()).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow, `${path} overflows horizontally`).toBeLessThanOrEqual(1);
    }
  });
});

test.describe('Desktop sidebar', () => {
  test('the trigger and Ctrl+B collapse and expand the sidebar', async ({ page }) => {
    await page.goto('/dashboard/overview');
    const sidebar = page.locator('[data-slot="sidebar"][data-state]').first();
    await expect(sidebar).toHaveAttribute('data-state', 'expanded');

    await page.getByRole('button', { name: 'Toggle Sidebar' }).first().click();
    await expect(sidebar).toHaveAttribute('data-state', 'collapsed');

    await page.keyboard.press('Control+b');
    await expect(sidebar).toHaveAttribute('data-state', 'expanded');

    await page.keyboard.press('Control+b');
    await expect(sidebar).toHaveAttribute('data-state', 'collapsed');
  });
});

test.describe('Keyboard and accessibility basics', () => {
  test('first Tab stop is a skip link that targets the main content', async ({ page }) => {
    await page.goto('/dashboard/overview');
    await page.waitForLoadState('networkidle');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await expect(skip).toHaveAttribute('href', '#main-content');
    await expect(page.locator('#main-content')).toHaveCount(1);
  });

  // Flaky under load (kbar input remounts) — see the FIXME below.
  test('Ctrl+K opens the command palette and Escape closes it', async ({ page }) => {
    await page.goto('/dashboard/overview');
    const input = page.locator('input[aria-controls="kbar-listbox"]');

    await page.waitForLoadState('networkidle');
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('Control+k');
    await expect(input).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(input).toBeHidden();
  });

  test('kbar is operable by keyboard alone (type, Enter)', async ({ page }) => {
    await page.goto('/dashboard/overview');
    const input = page.locator('input[aria-controls="kbar-listbox"]');
    await page.waitForLoadState('networkidle');
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('Control+k');
    await expect(input).toBeVisible();

    await page.keyboard.type('Archives');
    await expect(page.getByText('Go to Archives')).toBeVisible();
    await page.keyboard.press('Enter');
    await page.waitForURL('**/dashboard/archives', { waitUntil: 'commit' });
  });

  test('landmarks and document language are present', async ({ page }) => {
    await page.goto('/dashboard/overview');
    await expect(page.locator('html')).toHaveAttribute('lang', /.+/);
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('navigation').first()).toBeVisible();
  });

  test('icon-only header controls expose accessible names', async ({ page }) => {
    await page.goto('/dashboard/overview');
    await expect(page.getByRole('button', { name: 'Toggle Sidebar' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Toggle theme' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'User menu' })).toBeVisible();
  });

  test('routes set a descriptive document title', async ({ page }) => {
    test.slow();
    const titles: [string, RegExp][] = [
      ['/dashboard/archives', /Archives/],
      ['/dashboard/billing', /Billing/],
      ['/dashboard/product', /Products/],
      ['/dashboard/forms/basic', /Basic Form/],
      ['/dashboard/forms/advanced', /Advanced Form/],
      ['/dashboard/forms/multi-step', /Multi-Step/],
      ['/dashboard/forms/sheet-form', /Sheet Form/],
      ['/dashboard/elements/icons', /Icons/],
      ['/dashboard/react-query', /React Query/]
    ];
    for (const [path, re] of titles) {
      await page.goto(path);
      await expect(page, `${path} title`).toHaveTitle(re, { timeout: 30_000 });
    }
  });
});
