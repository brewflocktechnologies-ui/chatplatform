import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * POC pages (Website, Widget, Config) are thin views over the billing service.
 * Depending on the environment the service is either reachable (a table with
 * rows) or not (an error banner with a Retry action), so these tests assert
 * the parts that hold in both states: the page shell, the "add" form sheet and
 * its client-side validation, and graceful degradation. They never submit a
 * valid form, so no live billing data is created or changed.
 */

const sheetOf = (page: Page): Locator => page.getByRole('dialog');

/** Wait until the list has either rendered its table or fallen back to the Retry banner. */
async function settled(page: Page): Promise<void> {
  await expect(
    page
      .getByRole('table')
      .or(page.getByRole('button', { name: 'Retry' }))
      .first()
  ).toBeVisible();
}

async function openAddSheet(page: Page, buttonName: string, title: string): Promise<Locator> {
  await page.getByRole('button', { name: buttonName }).click();
  const sheet = sheetOf(page);
  await expect(sheet.getByText(title, { exact: true })).toBeVisible();
  return sheet;
}

test.describe('POC Website', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/poc-website');
  });

  test('renders the page header with the add action', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'POC Website' })).toBeVisible();
    await expect(page.getByText('Websites registered with the billing service.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Website' })).toBeVisible();
    await expect(page).toHaveTitle(/POC Website/);
  });

  test('shows either the websites table or an unreachable banner with Retry', async ({ page }) => {
    const table = page.getByRole('table');
    const retry = page.getByRole('button', { name: 'Retry' });
    await expect(table.or(retry).first()).toBeVisible();
    if (await table.isVisible()) {
      await expect(table.getByRole('columnheader', { name: /Domain/ })).toBeVisible();
      await expect(table.getByRole('columnheader', { name: /Category/ })).toBeVisible();
      await expect(table.getByRole('columnheader', { name: /Date Added/ })).toBeVisible();
    }
  });

  test('the add form reports every required field on an empty submit', async ({ page }) => {
    const sheet = await openAddSheet(page, 'Add Website', 'New Website');
    await sheet.getByRole('button', { name: 'Create Website' }).click();

    await expect(sheet.getByText('Domain is required')).toBeVisible();
    await expect(sheet.getByText('Customer ID is required')).toBeVisible();
    await expect(sheet.getByText('Please select a category')).toBeVisible();
    await expect(sheet.getByText('Flavour / config name is required')).toBeVisible();
    // Nothing was created: the sheet stays open.
    await expect(sheet).toBeVisible();
  });

  test('rejects a domain that includes a protocol or path', async ({ page }) => {
    const sheet = await openAddSheet(page, 'Add Website', 'New Website');
    await sheet.getByLabel('Domain').fill('https://not-a-bare-domain.example.com/path');
    await sheet.getByRole('button', { name: 'Create Website' }).click();
    await expect(
      sheet.getByText('Enter a bare domain like example.com (no protocol or path)')
    ).toBeVisible();
  });

  test('Cancel closes the sheet without creating anything', async ({ page }) => {
    const sheet = await openAddSheet(page, 'Add Website', 'New Website');
    await sheet.getByLabel('Domain').fill('cancelled-site.example.com');
    await sheet.getByRole('button', { name: 'Cancel' }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByText('cancelled-site.example.com')).toHaveCount(0);
  });

  test('a row opens a prefilled edit form that can be cancelled', async ({ page }) => {
    await settled(page);
    const menu = page.getByRole('button', { name: 'Open menu' }).first();
    test.skip(!(await menu.isVisible()), 'billing service has no websites to edit here');

    // The domain cell also shows the customer's email underneath; only the first line is the domain.
    const cell = (await page.getByRole('row').nth(1).getByRole('cell').first().innerText()).trim();
    const domain = cell.split('\n')[0];
    await menu.click();
    await page.getByRole('menuitem', { name: /Update/ }).click();

    const sheet = sheetOf(page);
    await expect(sheet.getByText('Edit Website', { exact: true })).toBeVisible();
    await expect(sheet.getByRole('button', { name: 'Update Website' })).toBeVisible();
    // The edit form is prefilled from the row, not blank.
    const shown = domain.replace(/^https?:\/\//, '');
    await expect(sheet.getByLabel('Domain')).toHaveValue(shown);
    await sheet.getByRole('button', { name: 'Cancel' }).click();
    await expect(sheet).toBeHidden();
  });

  test('sorting by Domain is reflected in the URL', async ({ page }) => {
    await settled(page);
    const header = page.getByRole('columnheader', { name: /Domain/ });
    test.skip(!(await header.isVisible()), 'no table to sort in this environment');
    await header.getByRole('button').click();
    await page.getByRole('menuitemcheckbox', { name: 'Asc' }).click();
    await expect(page).toHaveURL(/sort=/);
  });
});

test.describe('Widget', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/widget');
  });

  test('renders the page header with the add action', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Widget', exact: true })).toBeVisible();
    await expect(page.getByText('Chat widgets and their configuration.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Widget' })).toBeVisible();
    await expect(page).toHaveTitle(/Widget/);
  });

  test('shows a widgets table or degrades to an unreachable banner with Retry', async ({
    page
  }) => {
    const table = page.getByRole('table');
    const retry = page.getByRole('button', { name: 'Retry' });
    await expect(table.or(retry).first()).toBeVisible();
    if (await retry.isVisible()) {
      await expect(page.getByText(/API is unreachable|responded with/)).toBeVisible();
      // Retrying keeps the page intact rather than crashing it.
      await retry.click();
      await expect(page.getByRole('heading', { name: 'Widget', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Add Widget' })).toBeVisible();
    }
  });

  test('the add form starts with sensible defaults and requires a widget name', async ({
    page
  }) => {
    const sheet = await openAddSheet(page, 'Add Widget', 'New Widget');
    // Ids, position, theme and colour are prefilled; only the name is mandatory input.
    await expect(sheet.getByLabel('Company ID')).toHaveValue('702');
    await expect(sheet.getByLabel('Assistant ID')).toHaveValue('3902');
    await expect(sheet.getByRole('combobox', { name: /Position/ })).toContainText('Bottom right');
    await expect(sheet.getByRole('combobox', { name: /Theme/ })).toContainText('Light');
    await expect(sheet.getByRole('textbox', { name: 'Primary Color hex value' })).toHaveValue(
      '#007bff'
    );

    await sheet.getByRole('button', { name: 'Create Widget' }).click();
    await expect(sheet.getByText('Widget name is required')).toBeVisible();
    await expect(sheet).toBeVisible();
  });

  test('the id fields only accept whole numbers of at least 1', async ({ page }) => {
    const sheet = await openAddSheet(page, 'Add Widget', 'New Widget');
    for (const label of ['Company ID', 'Assistant ID']) {
      const input = sheet.getByLabel(label);
      await expect(input).toHaveAttribute('type', 'number');
      await expect(input).toHaveAttribute('min', '1');
    }
  });

  test('rejects a website URL that is not a full URL', async ({ page }) => {
    const sheet = await openAddSheet(page, 'Add Widget', 'New Widget');
    await sheet.getByLabel('Widget Name').fill('Support widget');
    await sheet.getByLabel('Website URL').fill('not a url');
    await sheet.getByRole('button', { name: 'Create Widget' }).click();

    // The sheet stays open on a validation error instead of calling the API.
    await expect(sheet.getByText(/Invalid input|Enter a full URL/)).toBeVisible();
    await expect(sheet).toBeVisible();
  });

  test('the popup delay field only appears when Auto popup is on', async ({ page }) => {
    const sheet = await openAddSheet(page, 'Add Widget', 'New Widget');
    const delay = sheet.getByLabel('Popup Delay (seconds)');
    await expect(delay).toHaveCount(0);
    await sheet.getByRole('switch', { name: /Auto popup/ }).click();
    await expect(delay).toBeVisible();
    await sheet.getByRole('switch', { name: /Auto popup/ }).click();
    await expect(delay).toHaveCount(0);
  });

  test('Cancel closes the sheet', async ({ page }) => {
    const sheet = await openAddSheet(page, 'Add Widget', 'New Widget');
    await sheet.getByRole('button', { name: 'Cancel' }).click();
    await expect(sheet).toBeHidden();
  });
});

test.describe('POC Config', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/widget-config');
  });

  test('renders the page header with the add action', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'POC Config' })).toBeVisible();
    await expect(
      page.getByText('Widget configs registered with the billing service.')
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Config' })).toBeVisible();
    await expect(page).toHaveTitle(/POC Config/);
  });

  test('shows a configs table or degrades to an unreachable banner with Retry', async ({
    page
  }) => {
    const table = page.getByRole('table');
    const retry = page.getByRole('button', { name: 'Retry' });
    await expect(table.or(retry).first()).toBeVisible();
    if (await retry.isVisible()) {
      await retry.click();
      await expect(page.getByRole('heading', { name: 'POC Config' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Add Config' })).toBeVisible();
    }
  });

  test('the add form reports the required fields on an empty submit', async ({ page }) => {
    const sheet = await openAddSheet(page, 'Add Config', 'New Config');
    await sheet.getByRole('button', { name: 'Create Config' }).click();

    await expect(sheet.getByText('Config name is required')).toBeVisible();
    await expect(sheet.getByText('Tenant ID is required')).toBeVisible();
    await expect(sheet).toBeVisible();
  });

  test('tenant and website link are read-only, filled from the chosen website', async ({
    page
  }) => {
    const sheet = await openAddSheet(page, 'Add Config', 'New Config');
    await expect(sheet.getByLabel('Tenant ID')).toHaveAttribute('readonly', '');
    await expect(sheet.getByLabel('Website Link')).toHaveAttribute('readonly', '');
    await expect(sheet.getByText("Taken from the selected website's company.")).toBeVisible();
    await expect(sheet.getByText('Taken from the selected website.')).toBeVisible();
  });

  test('validates the CDN config JSON', async ({ page }) => {
    const sheet = await openAddSheet(page, 'Add Config', 'New Config');
    await sheet.getByLabel('Config Name').fill('Deploy Test');
    await sheet.getByLabel('CDN Config (JSON)').fill('{ not json');
    await sheet.getByRole('button', { name: 'Create Config' }).click();

    await expect(sheet.getByText('Must be a valid JSON object')).toBeVisible();
  });

  test('Cancel closes the sheet', async ({ page }) => {
    const sheet = await openAddSheet(page, 'Add Config', 'New Config');
    await sheet.getByRole('button', { name: 'Cancel' }).click();
    await expect(sheet).toBeHidden();
  });
});
