import { expect, test } from '../support/fixtures';
import { uniqueName } from '../support/db';
import { ProductsPage } from '../support/pages/products-page';

/**
 * Products (/dashboard/product, /dashboard/product/[productId]).
 *
 * Backed by an in-memory mock store, so no database is involved. Mutations are
 * limited to one product this suite creates (run-unique `E2E-PW` name) and
 * deletes again. The mock store is split between server and browser memory, so
 * a client-created product cannot be opened on its edit page (it 404s); edit is
 * therefore only exercised on rows that exist server-side and is never saved.
 */

test.describe('Products list', () => {
  test('renders the table, header action and pagination', async ({ page }) => {
    const products = new ProductsPage(page);
    await products.goto();

    for (const col of ['IMAGE', 'Name', 'Category', 'PRICE', 'DESCRIPTION', 'ACTIONS']) {
      await expect(
        page.getByRole('columnheader', { name: new RegExp(col, 'i') }).first()
      ).toBeVisible();
    }
    await expect(products.dataRows).toHaveCount(10, { timeout: 30_000 });
    await expect(page.getByRole('link', { name: /Add New/ })).toHaveAttribute(
      'href',
      '/dashboard/product/new'
    );
  });

  test('search narrows rows, is reflected in the URL, and shows an empty state', async ({
    page
  }) => {
    const products = new ProductsPage(page);
    await products.goto();
    await expect(products.dataRows).toHaveCount(10, { timeout: 30_000 });

    // Search for a word taken from the first rendered product name.
    const firstName = (await products.dataRows.first().getByRole('cell').nth(1).innerText()).trim();
    const word = firstName.split(/\s+/).pop()!;
    await products.table.search(word);
    await expect(page).toHaveURL(new RegExp(`name=${encodeURIComponent(word)}`));
    await expect(products.dataRows.first()).toBeVisible();

    await products.table.search('zzzz-no-such-product-xyz');
    await expect(page.getByText('No results.')).toBeVisible({ timeout: 30_000 });
  });

  test('search term in the URL is applied on load', async ({ page }) => {
    // NB: hyphens are avoided on purpose — a hyphenated `name` param is
    // rewritten to commas in the search box (see product bugs in the report).
    await page.goto('/dashboard/product?name=zzzznosuchproduct');
    await expect(page.getByText('No results.')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByPlaceholder('Search products...')).toHaveValue('zzzznosuchproduct');
  });

  test('Add New navigates to the create form', async ({ page }) => {
    const products = new ProductsPage(page);
    await products.goto();
    await page.getByRole('link', { name: /Add New/ }).click();
    await page.waitForURL('**/dashboard/product/new', { waitUntil: 'commit' });
    await expect(page.getByText('Create New Product')).toBeVisible();
  });
});

test.describe('Product form', () => {
  test('rejects an empty submission with per-field errors', async ({ page }) => {
    await page.goto('/dashboard/product/new');
    await expect(page.getByText('Create New Product')).toBeVisible();

    await page.getByRole('button', { name: 'Add Product' }).click();

    await expect(page.getByText('Image is required.')).toBeVisible();
    await expect(page.getByText('Product name must be at least 2 characters.')).toBeVisible();
    await expect(page.getByText('Please select a category')).toBeVisible();
    await expect(page.getByText('Price is required')).toBeVisible();
    await expect(page.getByText('Description must be at least 10 characters.')).toBeVisible();
    // Still on the form.
    await expect(page).toHaveURL(/\/dashboard\/product\/new$/);
  });

  test('rejects too-short name/description even with the other fields valid', async ({ page }) => {
    const products = new ProductsPage(page);
    await page.goto('/dashboard/product/new');
    await expect(page.getByText('Create New Product')).toBeVisible();

    await products.uploadImage();
    await products.nameInput.fill('a');
    await products.chooseCategory('Electronics');
    await products.priceInput.fill('9.99');
    await products.descriptionInput.fill('too short');
    await page.getByRole('button', { name: 'Add Product' }).click();

    await expect(page.getByText('Product name must be at least 2 characters.')).toBeVisible();
    await expect(page.getByText('Description must be at least 10 characters.')).toBeVisible();
    await expect(page.getByText('Image is required.')).toHaveCount(0);
    await expect(page.getByText('Please select a category')).toHaveCount(0);
  });

  test('Cancel returns to the previous page', async ({ page }) => {
    const products = new ProductsPage(page);
    await products.goto();
    await page.getByRole('link', { name: /Add New/ }).click();
    await page.waitForURL('**/dashboard/product/new', { waitUntil: 'commit' });
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.waitForURL('**/dashboard/product', { waitUntil: 'commit' });
  });

  test('unknown product id renders the 404 page', async ({ page }) => {
    await page.goto('/dashboard/product/99999');
    await expect(page.getByText("Something's missing")).toBeVisible({ timeout: 30_000 });
  });

  test('Update on a listed row opens the edit form, which validates without saving', async ({
    page
  }) => {
    test.slow();
    const products = new ProductsPage(page);
    await products.goto();
    await expect(products.dataRows.first()).toBeVisible({ timeout: 30_000 });

    // Open the first row's action menu -> Update (client-side navigation).
    await products.dataRows.first().getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('menuitem', { name: 'Update' }).click();
    await page.waitForURL(/\/dashboard\/product\/\d+$/, { waitUntil: 'commit' });
    await expect(page.getByText('Edit Product')).toBeVisible({ timeout: 30_000 });
    await expect(products.nameInput).not.toHaveValue('');

    // Nothing is saved: clear the name and confirm validation blocks submit.
    await products.nameInput.fill('');
    await page.getByRole('button', { name: 'Update Product' }).click();
    await expect(page.getByText('Product name must be at least 2 characters.')).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/product\/\d+$/);
  });

  /** Creates a product through the UI (client-side navigation) and returns its name. */
  async function createProduct(page: import('@playwright/test').Page, products: ProductsPage) {
    const name = uniqueName('product');
    // Client-side navigation: the mock store also lives in the browser and is
    // reset by every full page load.
    await products.goto();
    await page.getByRole('link', { name: /Add New/ }).click();
    await page.waitForURL('**/dashboard/product/new', { waitUntil: 'commit' });
    await expect(page.getByText('Create New Product')).toBeVisible();

    await products.uploadImage();
    await products.nameInput.fill(name);
    await products.chooseCategory('Electronics');
    await products.priceInput.fill('19.5');
    await products.descriptionInput.fill('E2E generated product description');
    await page.getByRole('button', { name: 'Add Product' }).click();

    await expect(page.getByText('Product created').first()).toBeVisible({ timeout: 30_000 });
    await page.waitForURL('**/dashboard/product', { waitUntil: 'commit' });
    return name;
  }

  test('create a product, find it by search, then delete it', async ({ page }) => {
    test.slow();
    const products = new ProductsPage(page);
    const name = await createProduct(page, products);

    await products.table.search(name);
    await products.table.expectRowVisible(name);
    await expect(products.table.row(name)).toContainText('19.5');

    await products.table.rowAction(name, 'Delete');
    await products.table.confirmDelete();
    await expect(page.getByText('Product deleted successfully').first()).toBeVisible({
      timeout: 30_000
    });
  });

  // KNOWN PRODUCT BUG: product-tables/cell-action.tsx (and product-form.tsx)
  // spread the shared mutationOptions and then override `onSuccess`, which
  // drops the `invalidateQueries` call — so the list never refreshes after a
  // delete. test.fail() makes this pass while the bug exists and start failing
  // (prompting removal of the marker) once it is fixed.
  test('deleted product disappears from the list', async ({ page }) => {
    test.fail(true, 'cell-action onSuccess override skips query invalidation (stale list)');
    test.slow();
    const products = new ProductsPage(page);
    const name = await createProduct(page, products);

    await products.table.search(name);
    await products.table.expectRowVisible(name);
    await products.table.rowAction(name, 'Delete');
    await products.table.confirmDelete();
    await expect(page.getByText('Product deleted successfully').first()).toBeVisible({
      timeout: 30_000
    });
    await products.table.expectRowGone(name);
  });
});
