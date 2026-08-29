import { test, expect } from '@playwright/test';
import { bootWidget, openWidget } from './helpers';

/**
 * Failure-path coverage: when the remote config is missing, corrupt, or slow
 * the widget must degrade gracefully — falling back to the bundled
 * default.json — and remain usable.
 */
test.describe('Config failure paths', () => {
  async function assertFallbackIsUsable(page: import('@playwright/test').Page) {
    await expect(page.locator('.bubble-wrapper')).toBeVisible({ timeout: 20_000 });
    await openWidget(page);

    // default.json is the real fallback client: welcome card enabled,
    // prechat disabled.
    await expect(page.locator('cw-welcome-card')).toBeVisible();
    await page.getByRole('button', { name: 'Start Conversation' }).click();
    await expect(page.locator('cw-chat-form')).toHaveCount(0);
    await expect(page.locator('cw-composer textarea')).toBeVisible();

    // The fallback widget still accepts a message.
    const composer = page.locator('cw-composer textarea');
    await composer.fill('Is anyone there?');
    await composer.press('Enter');
    await expect(page.locator('.bubble-row.from-visitor .bubble')).toContainText('Is anyone there?');
  }

  test('missing config (404) falls back to a usable default widget', async ({ page }) => {
    await bootWidget(page, { client: 'amber', configStatus: 404 });
    await assertFallbackIsUsable(page);
  });

  test('malformed config JSON falls back to a usable default widget', async ({ page }) => {
    await bootWidget(page, { client: 'amber', configBody: '{this is "not" json!!!' });
    await assertFallbackIsUsable(page);
  });

  test('slow config response still initializes and renders, no crash', async ({ page }) => {
    await bootWidget(page, { client: 'amber', configDelayMs: 4_000 });

    // The widget comes up once the (slow) config resolves and applies amber.
    await expect(page.locator('.bubble-wrapper')).toBeVisible({ timeout: 20_000 });
    await openWidget(page);
    await expect(page.locator('cw-welcome-card')).toBeVisible();

    // Header brand renders once the chat is started (amber is prechat-enabled).
    await page.getByRole('button', { name: 'Start Conversation' }).click();
    await expect(page.locator('cw-chat-form')).toBeVisible();
    await expect(page.locator('.panel-header .title-text')).toContainText('Vortex Studio Support');
  });
});