import { expect, test } from '@playwright/test';

/**
 * Engage dashboard: the traffic view (customer activity table + contact
 * profile), its activity filters, and the campaigns/goals sub-views. Runs
 * against the seeded mock data in the customer store — no database needed.
 */

test.describe('Engage dashboard', () => {
  test('shows the engage tabs and the traffic insights view by default', async ({ page }) => {
    await page.goto('/dashboard/engage');

    await expect(page.getByRole('heading', { name: 'Engage' })).toBeVisible();
    for (const tab of ['traffic', 'campaigns', 'goals']) {
      await expect(page.getByRole('button', { name: tab, exact: true })).toBeVisible();
    }

    await expect(page.getByRole('heading', { name: '📊 Traffic Insights' })).toBeVisible({
      timeout: 20_000
    });
  });

  test('renders the seeded customer table and activity filter counts', async ({ page }) => {
    await page.goto('/dashboard/engage');
    await expect(page.getByRole('heading', { name: '📊 Traffic Insights' })).toBeVisible({
      timeout: 20_000
    });

    for (const name of ['You', 'Amit Shah', 'Samantha']) {
      await expect(page.getByRole('cell', { name })).toBeVisible();
    }
    for (const filter of [
      'All Customers (3)',
      'Chatting (1)',
      'Supervised (0)',
      'Queued (0)',
      'Waiting for Reply (1)',
      'Invited (0)',
      'Browsing (1)'
    ]) {
      await expect(page.getByRole('button', { name: filter })).toBeVisible();
    }
  });

  test('filters the table by activity', async ({ page }) => {
    await page.goto('/dashboard/engage');
    await expect(page.getByRole('heading', { name: '📊 Traffic Insights' })).toBeVisible({
      timeout: 20_000
    });

    await page.getByRole('button', { name: 'Chatting (1)' }).click();
    await expect(page.getByRole('cell', { name: 'You', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Amit Shah' })).not.toBeVisible();
    await expect(page.getByRole('cell', { name: 'Samantha' })).not.toBeVisible();

    await page.getByRole('button', { name: 'Browsing (1)' }).click();
    await expect(page.getByRole('cell', { name: 'Amit Shah' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'You', exact: true })).not.toBeVisible();

    await page.getByRole('button', { name: 'All Customers (3)' }).click();
    await expect(page.getByRole('cell', { name: 'You', exact: true })).toBeVisible();
  });

  test('opens the contact profile when a customer row is clicked', async ({ page }) => {
    await page.goto('/dashboard/engage');
    await expect(page.getByRole('heading', { name: '📊 Traffic Insights' })).toBeVisible({
      timeout: 20_000
    });

    await page.getByRole('cell', { name: 'You', exact: true }).click();
    await expect(page.getByText('you@example.com')).toBeVisible();
    await expect(page.getByText('online', { exact: true })).toBeVisible();

    // Collapsing the profile returns to the icon rail.
    await page.getByTitle('Close').click();
    await expect(page.getByText('you@example.com')).toHaveCount(0);
    await expect(page.getByTitle('Phone')).toBeVisible();
  });

  test('switches to the campaigns and goals views', async ({ page }) => {
    await page.goto('/dashboard/engage');
    await expect(page.getByRole('heading', { name: 'Engage' })).toBeVisible();

    await page.getByRole('button', { name: 'campaigns', exact: true }).click();
    await expect(page.getByText('🎯 Marketing Campaigns')).toBeVisible();

    await page.getByRole('button', { name: 'goals', exact: true }).click();
    await expect(page.getByText('🏁 Engagement Goals')).toBeVisible();

    await page.getByRole('button', { name: 'traffic', exact: true }).click();
    await expect(page.getByRole('heading', { name: '📊 Traffic Insights' })).toBeVisible();
  });
});
