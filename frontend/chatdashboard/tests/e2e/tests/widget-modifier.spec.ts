import { expect, skipWithoutDb, test } from '../support/fixtures';

/**
 * Widget Modifier workflows: the Customer -> Website -> Config selection
 * cascade that drives the embedded customization micro-frontend.
 *
 * The MFE itself (localhost:5001 / GitHub Pages remote) is an external
 * deployable, so these tests cover the dashboard-owned shell: selection
 * state, deep-link URL params, and data loading from MongoDB.
 */

test.beforeEach(() => skipWithoutDb());

test.describe('Widget Modifier', () => {
  test('website selection is gated until a customer is chosen', async ({ page }) => {
    await page.goto('/dashboard/widget-modifier');

    await expect(page.getByText('Select customer')).toBeVisible();
    await expect(page.getByText('Pick a customer first')).toBeVisible();
  });

  test('choosing a customer cascades into the website select and the URL', async ({ page, db }) => {
    const customer = await db.seedCustomer();
    const website = await db.seedWebsite(customer);

    await page.goto('/dashboard/widget-modifier');

    // Target the toolbar's customer select by its placeholder — the page
    // header carries an unrelated theme combobox.
    await page.getByRole('combobox').filter({ hasText: 'Select customer' }).click();
    await page.getByRole('option', { name: customer.name }).click();

    // The first website of the customer is auto-selected and deep-linked.
    await expect(page).toHaveURL(new RegExp(`customerId=${customer.id}`));
    await expect(page).toHaveURL(new RegExp(`websiteId=${website.id}`));
    // Same display quirk as below: the auto-selected website may render as
    // its raw id until the option list resolves.
    await expect(
      page.getByRole('combobox').filter({ hasText: new RegExp(`${website.domain}|${website.id}`) })
    ).toBeVisible();
  });

  test('the websites table deep-links into the modifier with selection pinned', async ({
    page,
    db
  }) => {
    const customer = await db.seedCustomer();
    const website = await db.seedWebsite(customer);

    await page.goto(`/dashboard/widget-modifier?customerId=${customer.id}&websiteId=${website.id}`);

    // The pinned ids stay selected in the toolbar comboboxes. (Display
    // quirk: when the selection arrives via URL before the option lists
    // load, the trigger shows the raw id instead of the display name.)
    await expect(
      page.getByRole('combobox').filter({ hasText: new RegExp(`${customer.name}|${customer.id}`) })
    ).toBeVisible();
    await expect(
      page.getByRole('combobox').filter({ hasText: new RegExp(`${website.domain}|${website.id}`) })
    ).toBeVisible();
  });
});
