import { expect, type Locator, type Page } from '@playwright/test';

/**
 * /dashboard/billing — plan administration (PlanAdmin + PlanFormSheet).
 *
 * The billing API is called from Next *server actions*
 * (src/features/billing/api/service.ts), so the browser never talks to it and
 * `page.route()` cannot mock its responses. The remote billing service is a
 * shared resource, so specs only READ from it (list/filter/sort) and never let
 * a create/update/delete reach it.
 */
export class BillingPage {
  readonly heading: Locator;
  readonly newPlanButton: Locator;
  readonly allFilter: Locator;
  readonly activeFilter: Locator;
  readonly sheet: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Billing & Plans' }).first();
    this.newPlanButton = page.getByRole('button', { name: 'New plan' });
    this.allFilter = page.getByRole('button', { name: 'All plans' });
    this.activeFilter = page.getByRole('button', { name: 'Active only' });
    this.sheet = page.getByRole('dialog');
  }

  async goto(): Promise<void> {
    await this.page.goto('/dashboard/billing');
    await expect(this.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.page.getByRole('columnheader', { name: 'Plan', exact: true })).toBeVisible({
      timeout: 60_000
    });
  }

  sortHeader(label: string): Locator {
    return this.page
      .getByRole('columnheader')
      .filter({ has: this.page.getByRole('button', { name: label, exact: true }) });
  }

  async openNewPlan(): Promise<void> {
    await this.newPlanButton.click();
    await expect(this.sheet.getByText('New plan', { exact: true }).first()).toBeVisible();
  }

  async fillPlan(values: {
    name?: string;
    description?: string;
    monthly?: number;
    annual?: number;
  }): Promise<void> {
    if (values.name !== undefined) await this.sheet.getByLabel('Name').fill(values.name);
    if (values.description !== undefined) {
      await this.sheet.getByLabel('Description').fill(values.description);
    }
    if (values.monthly !== undefined) {
      await this.sheet.getByLabel('Monthly ($)').fill(String(values.monthly));
    }
    if (values.annual !== undefined) {
      await this.sheet.getByLabel('Annual ($)').fill(String(values.annual));
    }
  }

  async submitSheet(label: 'Create plan' | 'Save changes'): Promise<void> {
    await this.sheet.getByRole('button', { name: label }).click();
  }
}
