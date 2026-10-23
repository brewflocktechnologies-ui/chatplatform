import { expect, test } from '../support/fixtures';
import { BillingPage } from '../support/pages/billing-page';

/**
 * Billing & Plans (/dashboard/billing).
 *
 * The plan list and mutations run through Next server actions to a remote,
 * shared billing service, so they cannot be mocked with page.route(). These
 * specs therefore only READ the live list and exercise client-side behaviour.
 * Create/update/delete requests are aborted at the browser (the server action
 * POST never leaves the dev server) so the shared service is never mutated.
 * Everything skips when the billing service is unreachable.
 */

const BILLING_URL = process.env.BILLING_API_URL ?? 'https://billing-service-iota.vercel.app';

test.describe('Billing & Plans', () => {
  // The remote billing service is slow (~20s per list request) and the page
  // server-prefetches it, so allow generous time and run one test at a time.
  test.describe.configure({ mode: 'serial', timeout: 120_000 });
  test.beforeAll(async () => {
    test.setTimeout(90_000);
    let ok = false;
    try {
      const res = await fetch(`${BILLING_URL}/api/plans?page=0&size=1&sort=id,desc`, {
        signal: AbortSignal.timeout(60_000)
      });
      ok = res.ok;
    } catch {
      ok = false;
    }
    test.skip(!ok, 'billing service is unreachable');
  });

  test('renders the stat tiles, table columns and pagination controls', async ({ page }) => {
    const billing = new BillingPage(page);
    await billing.goto();

    for (const label of ['Total plans', 'Active on this page', 'Free on this page']) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
    await expect(page.getByText('Avg. monthly (paid)')).toBeVisible();

    for (const col of ['Plan', 'Monthly', 'Annual', 'Annual saving', 'Active']) {
      await expect(page.getByRole('columnheader', { name: col, exact: true })).toBeVisible();
    }

    await expect(page.getByText(/^Page 1 of \d+/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    await expect(page.getByRole('combobox', { name: 'Rows per page' })).toBeVisible();
  });

  test('status filter toggles between all and active plans', async ({ page }) => {
    const billing = new BillingPage(page);
    await billing.goto();

    await expect(billing.allFilter).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Total plans', { exact: true })).toBeVisible();

    await billing.activeFilter.click();
    await expect(billing.activeFilter).toHaveAttribute('aria-pressed', 'true');
    await expect(billing.allFilter).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByText('Active plans', { exact: true })).toBeVisible();

    await billing.allFilter.click();
    await expect(page.getByText('Total plans', { exact: true })).toBeVisible();
  });

  test('sortable headers cycle ascending, descending, then back to default', async ({ page }) => {
    const billing = new BillingPage(page);
    await billing.goto();

    const header = billing.sortHeader('Monthly');
    await header.getByRole('button').click();
    await expect(header).toHaveAttribute('aria-sort', 'ascending');
    await header.getByRole('button').click();
    await expect(header).toHaveAttribute('aria-sort', 'descending');
    await header.getByRole('button').click();
    // Third click resets to the default (id desc), which no visible column owns.
    await expect(header).not.toHaveAttribute('aria-sort', /.+/);
  });

  test('rows-per-page selector offers the documented page sizes', async ({ page }) => {
    const billing = new BillingPage(page);
    await billing.goto();

    await page.getByRole('combobox', { name: 'Rows per page' }).click();
    for (const n of ['10', '20', '50', '100']) {
      await expect(page.getByRole('option', { name: n, exact: true })).toBeVisible();
    }
    await page.getByRole('option', { name: '20', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Rows per page' })).toContainText('20');
  });

  test('new-plan sheet validates required fields and paid-plan pricing', async ({ page }) => {
    const billing = new BillingPage(page);
    await billing.goto();
    await billing.openNewPlan();

    await billing.submitSheet('Create plan');
    await expect(billing.sheet.getByText('Plan name is required')).toBeVisible();
    await expect(billing.sheet.getByText('Paid plans need a monthly price above 0')).toBeVisible();

    // Fixing the price clears that error; the name error remains until filled.
    await billing.fillPlan({ monthly: 10 });
    await billing.submitSheet('Create plan');
    await expect(billing.sheet.getByText('Paid plans need a monthly price above 0')).toHaveCount(0);
    await expect(billing.sheet.getByText('Plan name is required')).toBeVisible();

    await billing.sheet.getByRole('button', { name: 'Cancel' }).click();
    await expect(billing.sheet).toBeHidden();
  });

  test('a failed create keeps the sheet open and reports an error (request aborted)', async ({
    page
  }) => {
    const billing = new BillingPage(page);
    await billing.goto();

    // Server actions are POSTs to the page URL carrying a Next-Action header.
    // Aborting them proves the error path without touching the shared service.
    let intercepted = 0;
    await page.route('**/dashboard/billing*', async (route) => {
      const req = route.request();
      if (req.method() === 'POST' && req.headers()['next-action']) {
        intercepted++;
        return route.abort('failed');
      }
      return route.continue();
    });

    await billing.openNewPlan();
    await billing.fillPlan({ name: 'E2E-PW aborted plan', monthly: 10, annual: 100 });
    await billing.submitSheet('Create plan');

    await expect(page.getByText(/Couldn't create plan|fetch|failed/i).first()).toBeVisible({
      timeout: 15_000
    });
    expect(intercepted).toBeGreaterThan(0);
    // Sheet stays open so the user does not lose their input.
    await expect(billing.sheet).toBeVisible();
    await expect(billing.sheet.getByLabel('Name')).toHaveValue('E2E-PW aborted plan');
  });
});
