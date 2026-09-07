import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Interactions shared by the Customers and Websites data tables
 * (DataTable + DataTableToolbar + row CellAction dropdown).
 */
export class DataTablePage {
  constructor(
    readonly page: Page,
    /** Toolbar text-filter placeholder, e.g. 'Search customers...'. */
    readonly searchPlaceholder: string
  ) {}

  get searchInput(): Locator {
    return this.page.getByPlaceholder(this.searchPlaceholder);
  }

  /**
   * Type into the toolbar filter (500ms debounce + server roundtrip). The
   * whole table — toolbar included — suspends into a skeleton while the
   * filtered query refetches, so filling is retried if the input remounts.
   */
  async search(term: string): Promise<void> {
    await expect(async () => {
      await this.searchInput.fill(term, { timeout: 5_000 });
      await expect(this.searchInput).toHaveValue(term, { timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
  }

  row(text: string): Locator {
    return this.page.getByRole('row').filter({ hasText: text });
  }

  async expectRowVisible(text: string): Promise<void> {
    // Generous timeout: covers the filter debounce plus a suspenseful
    // server-action roundtrip to MongoDB Atlas.
    await expect(this.row(text)).toBeVisible({ timeout: 30_000 });
  }

  async expectRowGone(text: string): Promise<void> {
    await expect(this.row(text)).toHaveCount(0);
  }

  /**
   * Open the row's actions dropdown and pick a menu item. A background
   * refetch can remount the row and close a freshly opened menu, so opening
   * is retried until the item is actually visible.
   */
  async rowAction(rowText: string, action: string): Promise<void> {
    const menuItem = this.page.getByRole('menuitem', { name: action });
    await expect(async () => {
      await this.row(rowText).getByRole('button', { name: 'Open menu' }).click();
      await expect(menuItem).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
    await menuItem.click();
  }

  async confirmDelete(): Promise<void> {
    await expect(this.page.getByText('Are you sure?')).toBeVisible();
    await this.page.getByRole('button', { name: 'Continue' }).click();
  }

  async expectToast(text: string): Promise<void> {
    await expect(this.page.getByText(text, { exact: false }).first()).toBeVisible();
  }
}
