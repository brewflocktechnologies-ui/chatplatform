import { expect, skipWithoutDb, test } from '../support/fixtures';
import { DataTablePage } from '../support/pages/data-table-page';

/**
 * Customers workflows: list/search (nuqs URL state + server actions against
 * MongoDB), edit and delete via the row actions menu.
 *
 * Each test seeds its own uniquely-named customer straight into the same
 * MongoDB the app reads, and the fixture removes it afterwards — no test
 * touches pre-existing data.
 */

test.beforeEach(() => skipWithoutDb());

// Independent tests, but run in order in one worker: concurrent suspenseful
// table refetches against Atlas through the dev server are the main source
// of timeout flake when these scatter across workers.
test.describe.configure({ mode: 'default' });

test.describe('Customers', () => {
  test('searching finds a seeded customer and syncs the URL', async ({ page, db }) => {
    const customer = await db.seedCustomer();
    const table = new DataTablePage(page, 'Search customers...');

    await page.goto('/dashboard/customers');
    await table.search(customer.name);
    await table.expectRowVisible(customer.name);
    await expect(table.row(customer.name)).toContainText(customer.email);

    // nuqs mirrors the toolbar filter into the query string (debounced).
    await expect(page).toHaveURL(/name=/);
  });

  test('searching for a non-existent customer shows the empty state', async ({ page }) => {
    const table = new DataTablePage(page, 'Search customers...');
    await page.goto('/dashboard/customers');
    await table.search('zzz-no-such-customer-zzz');
    await expect(page.getByText('No results.')).toBeVisible();
  });

  test('pagination controls are wired to the result set', async ({ page }) => {
    await page.goto('/dashboard/customers');
    await expect(page.getByText(/Page \d+ of/)).toBeVisible();
    await expect(page.getByText('Rows per page')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to previous page' })).toBeDisabled();
  });

  test('editing a customer persists and refreshes the table', async ({ page, db }) => {
    const customer = await db.seedCustomer();
    const table = new DataTablePage(page, 'Search customers...');

    await page.goto('/dashboard/customers');
    await table.search(customer.name);
    await table.expectRowVisible(customer.name);

    await table.rowAction(customer.name, 'Update');
    const sheet = page.getByRole('dialog');
    await expect(sheet.getByText('Edit Customer')).toBeVisible();

    await sheet.getByLabel('Country').fill('wonderland');
    await sheet.getByRole('button', { name: 'Update Customer' }).click();

    await table.expectToast('Customer updated');
    // Cache invalidation refetches the list; the row reflects the new value.
    await expect(table.row(customer.name)).toContainText('wonderland');
  });

  test('deleting a customer requires confirmation and removes the row', async ({ page, db }) => {
    const customer = await db.seedCustomer();
    const table = new DataTablePage(page, 'Search customers...');

    await page.goto('/dashboard/customers');
    await table.search(customer.name);
    await table.expectRowVisible(customer.name);

    await table.rowAction(customer.name, 'Delete');
    await table.confirmDelete();

    await table.expectToast('Customer deleted successfully');
    await table.expectRowGone(customer.name);
  });
});
