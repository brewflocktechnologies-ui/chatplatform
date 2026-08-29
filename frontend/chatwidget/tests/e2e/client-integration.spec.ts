import { test, expect } from '@playwright/test';
import { bootWidget, openWidget, startConversation } from './helpers';

/**
 * Real integration surface: a <script src="dist/chat-widget.js"
 * data-client-id> tag bootstraps the widget, fetches the client JSON, and
 * renders it. These tests never touch injectStoreConfig/getDebugInfo — they
 * verify what actually renders for the deployed client configs.
 */
test.describe('Widget bootstrap & real client configs', () => {
  test('script-tag bootstrap mounts exactly one widget and auto-opens from data-client-id', async ({ page }) => {
    await bootWidget(page, { client: 'amber' });

    const bubble = page.locator('.bubble-wrapper');
    await expect(bubble).toBeVisible();
    await expect(bubble).toHaveAttribute('aria-label', 'Open chat');

    await openWidget(page);
    // Welcome card first (amber), then start the chat to reveal the header — the
    // header is intentionally hidden on the welcome screen.
    await expect(page.locator('cw-welcome-card')).toBeVisible();
    await startConversation(page);

    // Amber branding from public/clients/amber.json must render in the header.
    await expect(page.locator('.panel-header .title-text')).toContainText('Vortex Studio Support');
  });

  const clients: Array<{ id: string; trigger: 'bubble' | 'chatbar'; header: string; welcome: boolean; barText?: string }> = [
    { id: 'amber', trigger: 'bubble', header: 'Vortex Studio Support', welcome: true },
    { id: 'default', trigger: 'bubble', header: 'Vortex Studio Support', welcome: true },
    { id: 'google', trigger: 'bubble', header: 'Google Cloud Support', welcome: true },
    { id: 'emerald', trigger: 'chatbar', header: 'EcoSphere Support', welcome: true, barText: 'Chat with us' },
    { id: 'phonepe', trigger: 'chatbar', header: 'PhonePe Support', welcome: false },
  ];

  for (const c of clients) {
    test(`client "${c.id}" renders its real config and branding`, async ({ page }) => {
      await bootWidget(page, { client: c.id });

      const trigger = page.locator(c.trigger === 'bubble' ? '.bubble-wrapper' : '.chatbar-wrapper');
      await expect(trigger).toBeVisible({ timeout: 20_000 });
      if (c.barText) {
        await expect(page.locator('.chatbar-wrapper .bar-layout')).toContainText(c.barText);
      }

      await trigger.click();
      await expect(page.locator('.zotly-widget-panel-wrapper')).toBeVisible();

      if (c.welcome) {
        // Welcome card, then start the chat to reveal the header brand.
        await expect(page.locator('cw-welcome-card')).toBeVisible();
        await startConversation(page);
      } else if (c.id === 'phonepe') {
        // No welcome screen: straight to active chat with a composer.
        await expect(page.locator('cw-composer')).toBeVisible();
      }

      await expect(page.locator('.panel-header .title-text')).toContainText(c.header);
    });
  }

  test('double inclusion of the script tag does not duplicate-mount the widget', async ({ page }) => {
    // Silence the expected "custom element already defined" error from the
    // second IIFE execution; the assertion is that only ONE widget surfaces.
    page.on('pageerror', () => {});

    await page.goto('/tests/e2e/harness/host.html?client=amber&double=1');

    await expect(page.locator('cw-widget-root')).toHaveCount(1, { timeout: 20_000 });
    await expect(page.locator('.bubble-wrapper')).toHaveCount(1);

    // And it still works end to end.
    await openWidget(page);
    await expect(page.locator('cw-welcome-card')).toBeVisible();
    await startConversation(page);
    await expect(page.locator('.panel-header .title-text')).toContainText('Vortex Studio Support');
  });
});