import { expect, test, type Page } from '@playwright/test';

/**
 * Cross-cutting shell features that no page-level spec exercises: the
 * contextual info panel (header "Show information" button, close button and
 * Ctrl+I shortcut) and the fullscreen toggle in the header.
 */

const infobar = (page: Page) => page.locator('[data-slot="infobar"]');

test.describe('Info panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/product');
    await expect(page.getByRole('heading', { name: 'Products', exact: true })).toBeVisible();
  });

  test('is collapsed until asked for, then opens from the header button', async ({ page }) => {
    await expect(infobar(page)).toHaveAttribute('data-state', 'collapsed');
    await page.getByRole('button', { name: 'Show information' }).click();
    await expect(infobar(page)).toHaveAttribute('data-state', 'expanded');
  });

  test('the close button collapses the panel again', async ({ page }) => {
    await page.getByRole('button', { name: 'Show information' }).click();
    await expect(infobar(page)).toHaveAttribute('data-state', 'expanded');
    await page.getByRole('button', { name: 'Close info panel' }).click();
    await expect(infobar(page)).toHaveAttribute('data-state', 'collapsed');
  });

  test('Ctrl+I toggles the panel from the keyboard', async ({ page }) => {
    await expect(infobar(page)).toHaveAttribute('data-state', 'collapsed');
    await page.keyboard.press('Control+i');
    await expect(infobar(page)).toHaveAttribute('data-state', 'expanded');
    await page.keyboard.press('Control+i');
    await expect(infobar(page)).toHaveAttribute('data-state', 'collapsed');
  });

  test('shows page-specific content that changes with the page', async ({ page }) => {
    await page.getByRole('button', { name: 'Show information' }).click();
    await expect(infobar(page)).toHaveAttribute('data-state', 'expanded');
    const productsText = (await infobar(page).innerText()).trim();
    expect(productsText.length).toBeGreaterThan(20);

    // Client-side navigate to another page that has its own info content.
    await page.goto('/dashboard/react-query');
    await expect(page.getByRole('heading', { name: 'React Query', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Show information' }).click();
    await expect(infobar(page)).toHaveAttribute('data-state', 'expanded');
    const reactQueryText = (await infobar(page).innerText()).trim();
    expect(reactQueryText.length).toBeGreaterThan(20);
    expect(reactQueryText).not.toEqual(productsText);
  });
});

test.describe('Fullscreen toggle', () => {
  test('enters and exits fullscreen, updating its accessible label', async ({ page }) => {
    await page.goto('/dashboard/overview');
    const enter = page.getByRole('button', { name: 'Enter fullscreen' });
    await expect(enter).toBeVisible();

    await enter.click();
    await expect(page.getByRole('button', { name: 'Exit fullscreen' })).toBeVisible();
    expect(await page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);

    await page.getByRole('button', { name: 'Exit fullscreen' }).click();
    await expect(page.getByRole('button', { name: 'Enter fullscreen' })).toBeVisible();
    expect(await page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
  });
});
