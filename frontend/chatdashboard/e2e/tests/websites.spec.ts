import { expect, skipWithoutDb, test } from '../support/fixtures';
import { uniqueDomain } from '../support/db';
import { DataTablePage } from '../support/pages/data-table-page';

/**
 * Websites workflows: listing/search, the four-step embed-code wizard
 * (the core "install the widget on your site" journey), edit, and delete.
 * Data is seeded per test into the app's MongoDB and cleaned up afterwards.
 */

test.beforeEach(() => skipWithoutDb());

// Independent tests, but run in order in one worker: concurrent suspenseful
// table refetches against Atlas through the dev server are the main source
// of timeout flake when these scatter across workers.
test.describe.configure({ mode: 'default' });

test.describe('Websites', () => {
  test('searching finds a seeded website with its customer', async ({ page, db }) => {
    const customer = await db.seedCustomer();
    const website = await db.seedWebsite(customer);
    const table = new DataTablePage(page, 'Search websites...');

    await page.goto('/dashboard/websites');
    await table.search(website.domain);
    await table.expectRowVisible(website.domain);
    await expect(table.row(website.domain)).toContainText(customer.name);
  });

  test('creating a website from the page header', async ({ page, db }) => {
    const customer = await db.seedCustomer();
    const domain = uniqueDomain();
    db.trackWebsiteDomain(domain);
    const table = new DataTablePage(page, 'Search websites...');

    await page.goto('/dashboard/websites');
    await page.getByRole('button', { name: 'Add Website' }).click();

    const sheet = page.getByRole('dialog');
    await expect(sheet.getByRole('heading', { name: 'New Website' })).toBeVisible();

    await sheet.getByLabel(/^Domain/).fill(domain);
    // Owner options load from MongoDB; pick the seeded customer.
    await sheet.getByLabel(/^Customer/).click();
    await page.getByRole('option', { name: new RegExp(customer.name) }).click();
    await sheet.getByLabel(/Business Category/).click();
    await page.getByRole('option', { name: 'Saas' }).click();
    await sheet.getByLabel(/Flavour/).fill('Orange');

    await sheet.getByRole('button', { name: 'Create Website' }).click();
    await table.expectToast('Website created');

    await table.search(domain);
    await table.expectRowVisible(domain);
    await expect(table.row(domain)).toContainText(customer.name);
  });

  test('embed-code wizard shows the site-specific snippet and copies it', async ({ page, db }) => {
    const customer = await db.seedCustomer();
    const website = await db.seedWebsite(customer);
    const table = new DataTablePage(page, 'Search websites...');

    await page.goto('/dashboard/websites');
    await table.search(website.domain);
    await table.rowAction(website.domain, 'Get Code');

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Install the chat widget')).toBeVisible();
    await expect(dialog.getByText(website.domain)).toBeVisible();

    // The snippet must target exactly this website.
    await expect(dialog.locator('pre')).toContainText(`data-website-id="${website.id}"`);

    await dialog.getByRole('button', { name: 'Copy' }).click();
    await expect(page.getByText('Code copied to clipboard!')).toBeVisible();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain(`data-website-id="${website.id}"`);

    // Walk the wizard to the end and finish.
    for (let i = 0; i < 3; i++) {
      await dialog.getByRole('button', { name: 'Next' }).click();
    }
    await dialog.getByRole('button', { name: 'Finish' }).click();
    await expect(dialog).toBeHidden();
  });

  test('editing a website persists the new domain', async ({ page, db }) => {
    const customer = await db.seedCustomer();
    const website = await db.seedWebsite(customer);
    const table = new DataTablePage(page, 'Search websites...');
    const newDomain = website.domain.replace('.example.test', '-renamed.example.test');

    await page.goto('/dashboard/websites');
    await table.search(website.domain);
    await table.rowAction(website.domain, 'Update');

    const sheet = page.getByRole('dialog');
    await expect(sheet.getByText('Edit Website')).toBeVisible();
    await sheet.getByLabel('Domain').fill(newDomain);
    await sheet.getByRole('button', { name: 'Update Website' }).click();

    await table.expectToast('Website updated');

    // Prove persistence with a fresh server-rendered load filtered to the
    // new domain (avoids racing the client cache invalidation).
    await page.goto(`/dashboard/websites?name=${encodeURIComponent(newDomain)}`);
    await table.expectRowVisible(newDomain);
  });

  test('deleting a website requires confirmation and removes the row', async ({ page, db }) => {
    const customer = await db.seedCustomer();
    const website = await db.seedWebsite(customer);
    const table = new DataTablePage(page, 'Search websites...');

    await page.goto('/dashboard/websites');
    await table.search(website.domain);
    await table.expectRowVisible(website.domain);

    await table.rowAction(website.domain, 'Delete');
    await table.confirmDelete();

    await table.expectToast('Website deleted successfully');
    await table.expectRowGone(website.domain);
  });
});
