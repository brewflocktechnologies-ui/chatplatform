import { expect, test } from '@playwright/test';

/**
 * Overview dashboard: the landing page after sign-in. Verifies the stat
 * cards and that every parallel-route slot (@area_stats, @bar_stats,
 * @pie_stats, @sales) streams in — the sales slot is intentionally delayed
 * ~3s server-side, so this also exercises the Suspense streaming path.
 */

test.describe('Overview dashboard', () => {
  test('shows the welcome header and all four stat cards', async ({ page }) => {
    await page.goto('/dashboard/overview');

    await expect(page.getByRole('heading', { name: /Hi, Welcome back/ })).toBeVisible();
    for (const stat of ['Total Revenue', 'New Customers', 'Active Accounts', 'Growth Rate']) {
      await expect(page.getByText(stat, { exact: true })).toBeVisible();
    }
  });

  test('streams in all chart and sales slots', async ({ page }) => {
    await page.goto('/dashboard/overview');

    // The sales slot is served behind an artificial 3s delay.
    await expect(page.getByText('Recent Sales')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('You made 265 sales this month.')).toBeVisible();

    // Chart slots render Recharts SVG surfaces once hydrated.
    await expect(page.locator('.recharts-responsive-container').first()).toBeVisible({
      timeout: 20_000
    });
    expect(await page.locator('.recharts-responsive-container').count()).toBeGreaterThanOrEqual(2);
  });
});
