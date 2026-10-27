import { expect, test } from '../support/fixtures';
import { firstLiveCustomer } from '../support/customers-api';
import { DataTablePage } from '../support/pages/data-table-page';

/**
 * Customers workflows: a read-only list backed by the billing service
 * (GET /api/customers through server actions), with nuqs URL state. The API
 * is shared and live, so tests read a real customer instead of seeding one.
 */

// Independent tests, but run in order in one worker: the first call to the
// serverless API can be slow, and scattering them across workers multiplies it.
test.describe.configure({ mode: 'default' });

test.describe('Customers', () => {
  test('lists customers with the API-backed columns', async ({ page }) => {
    await page.goto('/dashboard/customers');

    for (const header of ['Email', 'External ID', 'Country', 'Card', 'Active Plan', 'Invoices']) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible({
        timeout: 30_000
      });
    }
    // Header row plus at least one customer.
    await expect(page.getByRole('row')).not.toHaveCount(1);
  });

  test('searching finds a live customer and syncs the URL', async ({ page, request }) => {
    const customer = await firstLiveCustomer(request);
    const table = new DataTablePage(page, 'Search customers...');

    await page.goto('/dashboard/customers');
    await table.search(customer.email);
    await table.expectRowVisible(customer.email);

    // nuqs mirrors the toolbar filter into the query string (debounced).
    await expect(page).toHaveURL(/email=/);
  });

  test('searching for a non-existent customer shows the empty state', async ({ page }) => {
    const table = new DataTablePage(page, 'Search customers...');
    await page.goto('/dashboard/customers');
    await table.search('zzz-no-such-customer-zzz');
    await expect(page.getByText('No results.')).toBeVisible({ timeout: 60_000 });
  });

  test('pagination controls are wired to the result set', async ({ page }) => {
    await page.goto('/dashboard/customers');
    await expect(page.getByText(/Page \d+ of/)).toBeVisible();
    await expect(page.getByText('Rows per page')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to previous page' })).toBeDisabled();
  });

  test('the table offers an add button and per-row actions', async ({ page }) => {
    await page.goto('/dashboard/customers');
    await expect(page.getByRole('columnheader', { name: 'Email' })).toBeVisible({
      timeout: 30_000
    });
    await expect(page.getByRole('button', { name: 'Add Customer' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open menu' }).first()).toBeVisible({
      timeout: 30_000
    });
  });
});
