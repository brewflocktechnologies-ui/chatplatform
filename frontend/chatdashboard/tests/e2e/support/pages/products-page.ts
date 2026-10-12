import { expect, type Locator, type Page } from '@playwright/test';
import { DataTablePage } from './data-table-page';

/** 1x1 transparent PNG used to satisfy the product form's required image. */
export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

/**
 * /dashboard/product and /dashboard/product/[productId].
 *
 * The product "API" is an in-memory faker store (src/constants/mock-api.ts).
 * It is regenerated randomly per server start AND per browser page load (the
 * service module also runs client-side), so specs never rely on seeded names —
 * they read what is rendered, and mutate only rows they create themselves.
 */
export class ProductsPage {
  readonly table: DataTablePage;
  readonly heading: Locator;

  constructor(readonly page: Page) {
    this.table = new DataTablePage(page, 'Search products...');
    this.heading = page.getByRole('heading', { name: 'Products', exact: true }).first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/dashboard/product');
    await expect(this.heading).toBeVisible();
    await expect(this.table.searchInput).toBeVisible({ timeout: 30_000 });
  }

  /** Data rows only (header row excluded). */
  get dataRows(): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('cell') });
  }

  // --- product form -------------------------------------------------------

  get nameInput(): Locator {
    return this.page.getByLabel('Product Name');
  }
  get priceInput(): Locator {
    return this.page.getByLabel('Price');
  }
  get descriptionInput(): Locator {
    return this.page.getByLabel('Description');
  }
  get categorySelect(): Locator {
    return this.page.getByRole('combobox', { name: /Category/ });
  }

  async chooseCategory(label: string): Promise<void> {
    await this.categorySelect.click();
    await this.page.getByRole('option', { name: label, exact: true }).click();
  }

  async uploadImage(): Promise<void> {
    await this.page
      .locator('input[type="file"]')
      .setInputFiles({ name: 'e2e.png', mimeType: 'image/png', buffer: TINY_PNG });
  }
}
