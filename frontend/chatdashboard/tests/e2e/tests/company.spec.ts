import { expect, test } from '../support/fixtures';
import { deleteCompaniesWithPrefix, isBillingReachable } from '../support/company-api';
import { DataTablePage } from '../support/pages/data-table-page';

/**
 * Company (/dashboard/company).
 *
 * Companies live in the remote billing service and are read/written by Next
 * server actions, so the browser cannot mock them with page.route(). The
 * specs therefore work only on a company they create themselves, named with a
 * run-unique prefix; afterAll removes anything with that prefix through the
 * service's API, even if a test failed half-way. Pre-existing companies are
 * never edited or deleted. Everything skips when the service is unreachable.
 */

const RUN = `E2E-PW-${Date.now().toString(36)}`;
const NAME = `${RUN} Acme`;
const RENAMED_INDUSTRY = 'Quantum Plumbing';
// A search walks every page of the slow remote service, so allow far longer
// than the shared DataTablePage helpers (which assume a fast database).
const SEARCH_TIMEOUT = 120_000;

test.describe('Company', () => {
  // One shared remote service and one created row that later tests build on.
  test.describe.configure({ mode: 'serial', timeout: 240_000 });

  test.beforeAll(async () => {
    test.setTimeout(90_000);
    // Reason: Skipped when the remote billing backend service is unreachable or timed out.
    test.skip(!(await isBillingReachable()), 'billing service is unreachable');
  });

  test.afterAll(async () => {
    test.setTimeout(120_000);
    await deleteCompaniesWithPrefix(RUN).catch(() => {});
  });

  async function openCompanies(page: import('@playwright/test').Page) {
    await page.goto('/dashboard/company');
    await expect(page.getByRole('button', { name: /Add Company/ })).toBeVisible({
      timeout: 60_000
    });
    return new DataTablePage(page, 'Search companies...');
  }

  test('lists companies with the expected columns and toolbar', async ({ page }) => {
    await openCompanies(page);

    for (const col of ['Name', 'Email', 'Industry', 'City', 'State', 'Country', 'Employees']) {
      await expect(page.getByRole('columnheader', { name: col })).toBeVisible();
    }
    await expect(page.getByPlaceholder('Search companies...')).toBeVisible();
    await expect(page.getByRole('button', { name: /Add Company/ })).toBeVisible();
    // Each page of the live list renders at least one data row (plus the header row).
    await expect(page.getByRole('row').nth(1)).toBeVisible({ timeout: 60_000 });
  });

  test('new-company sheet validates before submitting and can be cancelled', async ({ page }) => {
    await openCompanies(page);
    await page.getByRole('button', { name: /Add Company/ }).click();

    const sheet = page.getByRole('dialog');
    await expect(sheet.getByRole('heading', { name: 'New Company' })).toBeVisible();

    await sheet.getByRole('button', { name: 'Create Company' }).click();
    await expect(sheet.getByText('Name must be at least 2 characters')).toBeVisible();

    await sheet.getByRole('button', { name: 'Cancel' }).click();
    await expect(sheet).toBeHidden();
  });

  test('a failed create keeps the sheet open and reports an error (request aborted)', async ({
    page
  }) => {
    await openCompanies(page);

    // Server actions are POSTs to the page URL with a Next-Action header.
    // Aborting them proves the error path without creating anything.
    let intercepted = 0;
    await page.route('**/dashboard/company*', async (route) => {
      const req = route.request();
      if (req.method() === 'POST' && req.headers()['next-action']) {
        intercepted++;
        return route.abort('failed');
      }
      return route.continue();
    });

    await page.getByRole('button', { name: /Add Company/ }).click();
    const sheet = page.getByRole('dialog');
    await sheet.getByLabel('Name').fill(`${RUN} Aborted`);
    await sheet.getByRole('button', { name: 'Create Company' }).click();

    await expect(page.getByText("Couldn't create company. Try again.")).toBeVisible({
      timeout: 15_000
    });
    expect(intercepted).toBeGreaterThan(0);
    await expect(sheet).toBeVisible();
    await expect(sheet.getByLabel('Name')).toHaveValue(`${RUN} Aborted`);
  });

  test('creating a company shows it in the list', async ({ page }) => {
    const table = await openCompanies(page);
    await page.getByRole('button', { name: /Add Company/ }).click();

    const sheet = page.getByRole('dialog');
    await sheet.getByLabel('Name').fill(NAME);
    await sheet.getByLabel('Contact Email').fill('e2e@example.com');
    await sheet.getByLabel('Industry').fill('Fintech');
    await sheet.getByLabel('City').fill('Pune');
    await sheet.getByLabel('Employees').fill('42');
    await sheet.getByRole('button', { name: 'Create Company' }).click();

    await table.expectToast('Company created');
    await expect(sheet).toBeHidden();
    // Searching while the post-create list refetch is still in flight can leave
    // the "search everything" request unsent. Reloading starts from a clean
    // client and also proves the company was saved server-side.
    await openCompanies(page);

    await table.search(NAME);
    await expect(table.row(NAME)).toBeVisible({ timeout: SEARCH_TIMEOUT });
    const row = table.row(NAME);
    await expect(row).toContainText('e2e@example.com');
    await expect(row).toContainText('Fintech');
    await expect(row).toContainText('Pune');
    await expect(row).toContainText('42');
  });

  test('search filters the whole list, syncs the URL and has an empty state', async ({ page }) => {
    const table = await openCompanies(page);

    await table.search(RUN);
    await expect(table.row(NAME)).toBeVisible({ timeout: SEARCH_TIMEOUT });
    await expect(table.row(NAME)).toHaveCount(1);
    await expect(page).toHaveURL(/name=/);

    // Matches other visible fields too, case-insensitively.
    await table.search(RUN.toLowerCase() + ' acme');
    await expect(table.row(NAME)).toBeVisible({ timeout: SEARCH_TIMEOUT });

    await table.search('zzz-no-such-company-zzz');
    await expect(page.getByText('No results.')).toBeVisible({ timeout: SEARCH_TIMEOUT });
  });

  test('the Name header sorts ascending and descending via the API, and can be reset', async ({
    page
  }) => {
    await openCompanies(page);
    const nameCells = page.locator('tbody tr td:first-child');
    // Wait for the unsorted first page, then remember its first row.
    await expect(nameCells.first()).toBeVisible({ timeout: SEARCH_TIMEOUT });
    const unsortedFirst = await nameCells.first().innerText();

    const sortBy = async (item: 'Asc' | 'Desc' | 'Reset') => {
      await page.getByRole('button', { name: 'Name', exact: true }).click();
      await page
        .getByRole(item === 'Reset' ? 'menuitem' : 'menuitemcheckbox', { name: item })
        .click();
    };

    await sortBy('Asc');
    await expect(page).toHaveURL(/sort=.*name.*false/, { timeout: 30_000 });
    // The old (unsorted) rows stay on screen until the sorted page arrives.
    await expect(nameCells.first()).not.toHaveText(unsortedFirst, { timeout: SEARCH_TIMEOUT });
    const ascFirst = await nameCells.first().innerText();
    const ascLast = await nameCells.last().innerText();
    expect(ascFirst).not.toBe(ascLast);

    // Descending reverses the order, so the first and last rows swap.
    await sortBy('Desc');
    await expect(page).toHaveURL(/sort=.*name.*true/, { timeout: 30_000 });
    await expect(nameCells.first()).toHaveText(ascLast, { timeout: SEARCH_TIMEOUT });
    await expect(nameCells.last()).toHaveText(ascFirst);

    await sortBy('Reset');
    // Reset leaves an empty sort (`sort=[]`) in the URL and restores the API's default order.
    await expect(page).toHaveURL(/sort=\[\]/, { timeout: 30_000 });
    await expect(nameCells.first()).toHaveText(unsortedFirst, { timeout: SEARCH_TIMEOUT });
  });

  test('editing a company persists the change', async ({ page }) => {
    const table = await openCompanies(page);
    await table.search(NAME);
    await expect(table.row(NAME)).toBeVisible({ timeout: SEARCH_TIMEOUT });

    const sheet = page.getByRole('dialog');
    // Rows remount while the search results settle, which can detach an open
    // sheet mid-edit, so open-edit-submit is retried until the sheet closes.
    await expect(async () => {
      await table.rowAction(NAME, 'Update');
      await expect(sheet.getByRole('heading', { name: 'Edit Company' })).toBeVisible({
        timeout: 5_000
      });
      // The form is prefilled from the row.
      await expect(sheet.getByLabel('Name')).toHaveValue(NAME, { timeout: 5_000 });
      await expect(sheet.getByLabel('Industry')).toHaveValue('Fintech', { timeout: 5_000 });

      await sheet.getByLabel('Industry').fill(RENAMED_INDUSTRY, { timeout: 5_000 });
      await sheet.getByRole('button', { name: 'Update Company' }).click({ timeout: 5_000 });
      await expect(sheet).toBeHidden({ timeout: 15_000 });
    }).toPass({ timeout: 90_000 });

    await expect(table.row(NAME)).toContainText(RENAMED_INDUSTRY, { timeout: SEARCH_TIMEOUT });

    // Survives a reload, i.e. it was saved server-side rather than only cached.
    await page.reload();
    const reloaded = new DataTablePage(page, 'Search companies...');
    await reloaded.search(NAME);
    await expect(reloaded.row(NAME)).toContainText(RENAMED_INDUSTRY, { timeout: SEARCH_TIMEOUT });
  });

  test('deleting a company requires confirmation and removes the row', async ({ page }) => {
    const table = await openCompanies(page);
    await table.search(NAME);
    await expect(table.row(NAME)).toBeVisible({ timeout: SEARCH_TIMEOUT });

    // Rows remount while the search results settle, which can detach an open
    // dialog, so each open-then-act step is retried until it sticks.
    // Cancelling keeps the row.
    await expect(async () => {
      await table.rowAction(NAME, 'Delete');
      await expect(page.getByText('Are you sure?')).toBeVisible({ timeout: 5_000 });
      await page.getByRole('button', { name: 'Cancel' }).click({ timeout: 5_000 });
      await expect(page.getByText('Are you sure?')).toBeHidden({ timeout: 5_000 });
    }).toPass({ timeout: 60_000 });
    await expect(table.row(NAME)).toBeVisible({ timeout: SEARCH_TIMEOUT });

    await expect(async () => {
      await table.rowAction(NAME, 'Delete');
      await expect(page.getByText('Are you sure?')).toBeVisible({ timeout: 5_000 });
      await page.getByRole('button', { name: 'Continue' }).click({ timeout: 5_000 });
      await expect(page.getByText('Are you sure?')).toBeHidden({ timeout: 15_000 });
    }).toPass({ timeout: 60_000 });

    await table.expectToast('Company deleted successfully');
    await expect(table.row(NAME)).toHaveCount(0, { timeout: SEARCH_TIMEOUT });
  });
});
