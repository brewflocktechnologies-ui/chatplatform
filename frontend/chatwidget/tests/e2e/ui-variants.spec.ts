import { test, expect } from '@playwright/test';
import { bootWidget, openWidget } from './helpers';

/**
 * Config-matrix coverage, driven through the public config-JSON pipeline
 * (page.route fulfils the fetched client JSON) and asserted against what a
 * user actually sees — never against getDebugInfo() or store internals.
 */
test.describe('Config UI variants', () => {
  test('bubble trigger is the default when no chatbar is configured', async ({ page }) => {
    await bootWidget(page, { client: 'default' });

    await expect(page.locator('.bubble-wrapper')).toBeVisible();
    await expect(page.locator('.chatbar-wrapper')).toHaveCount(0);
  });

  test('chatbar bar trigger renders the bar and opens the panel', async ({ page }) => {
    await bootWidget(page, {
      client: 'amber',
      config: {
        bubble: { enabled: false },
        chatbar: { enabled: true, layout: 'bar', text: 'Talk with us now' },
      },
    });

    await expect(page.locator('.chatbar-wrapper')).toBeVisible();
    await expect(page.locator('.chatbar-wrapper .bar-layout')).toContainText('Talk with us now');
    await expect(page.locator('.bubble-wrapper')).toHaveCount(0);

    await openWidget(page);
    await expect(page.locator('.panel-header .title-text')).toContainText('Zotly Support');
  });

  test('chatcard trigger renders the card layout with CTA', async ({ page }) => {
    await bootWidget(page, {
      client: 'amber',
      config: {
        bubble: { enabled: false },
        chatbar: { enabled: true, layout: 'card', cardText: 'Questions about PhonePe for business?' },
      },
    });

    const card = page.locator('.chatbar-wrapper .card-layout');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Questions about PhonePe for business?');
    await expect(card.getByText('Chat Now')).toBeVisible();

    await openWidget(page);
    await expect(page.locator('.zotly-widget-panel-wrapper')).toBeVisible();
  });

  test('prechatEnabled=false skips the form and goes straight to chat', async ({ page }) => {
    await bootWidget(page, {
      client: 'amber',
      config: {
        features: { prechatEnabled: false },
        chatWindow: { welcome: { enabled: true } },
      },
    });

    await openWidget(page);
    await expect(page.getByRole('button', { name: 'Start Conversation' })).toBeVisible();
    await page.getByRole('button', { name: 'Start Conversation' }).click();

    await expect(page.locator('cw-chat-form')).toHaveCount(0);
    await expect(page.locator('cw-composer textarea')).toBeVisible();
  });

  test('greet window appears with its title when enabled, and stays hidden when disabled', async ({ page }) => {
    await bootWidget(page, {
      client: 'amber',
      config: {
        greetWindow: {
          enabled: true,
          openingTimeAfterInitialLoadSec: 0,
          animationOpeningSec: 0.2,
          title: 'Hi there! 👋 Need help growing your business using AI?',
          inputBox: { enabled: false },
        },
      },
    });

    await expect(page.locator('.greet-wrapper')).toBeVisible();
    await expect(page.locator('.greet-card h3')).toContainText('Need help growing your business using AI?');

    // Disabled: the greet surface never becomes visible.
    await bootWidget(page, {
      client: 'amber',
      config: { greetWindow: { enabled: false } },
    });
    await expect(page.locator('.greet-wrapper')).toBeHidden();
  });

  test('feature toggles hide or show the composer attach and emoji buttons', async ({ page }) => {
    await bootWidget(page, {
      client: 'amber',
      config: {
        chatWindow: { attachmentsEnabled: true, modernUi: true },
      },
    });
    await openWidget(page);

    await expect(page.getByRole('button', { name: 'Attach' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Emoji' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible();

    // Turn everything off.
    await bootWidget(page, {
      client: 'amber',
      config: {
        chatWindow: { attachmentsEnabled: false, modernUi: false },
      },
    });
    await openWidget(page);

    await expect(page.locator('cw-composer textarea')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Attach' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Emoji' })).toHaveCount(0);
  });

  test('configured widget dimensions are honored', async ({ page }) => {
    await bootWidget(page, {
      client: 'amber',
      config: { chatWindow: { widgetWidth: 420, widgetHeight: 620 } },
    });
    await openWidget(page);

    const panel = page.locator('.zotly-widget-panel-wrapper');
    const vp = page.viewportSize();
    if (vp && vp.width >= 480) {
      // Desktop: the configured size applies as-is.
      await expect(panel).toHaveCSS('width', '420px');
      await expect(panel).toHaveCSS('height', '620px');
    } else {
      // Mobile: the panel is intentionally forced full-screen at the <=480px
      // breakpoint (cw-chat-panel), so the configured px are overridden.
      await expect(panel).toHaveCSS('width', `${vp.width}px`);
      await expect(panel).toHaveCSS('height', `${vp.height}px`);
    }
  });

  test('dark host theme applies the configured dark colors', async ({ page }) => {
    // Effective colors come from host.theme unless the client opts out with
    // useWebsiteTheme:false; the .dark class then flips to the dark palette.
    const darkConfig = {
      chatWindow: {
        useWebsiteTheme: false,
        accentColor: '#d97706',
        dark: { headerBg: '#1e293b', bodyBg: '#0f172a' },
      },
    };

    // Dark host: the .dark class is applied by the harness page itself.
    await bootWidget(page, { client: 'amber', config: darkConfig, dark: true });
    await openWidget(page);

    await expect(page.locator('.panel-header')).toHaveCSS('background-color', 'rgb(30, 41, 59)');
    await expect(page.locator('.panel')).toHaveCSS('background-color', 'rgb(15, 23, 42)');

    // Same config on a light host must NOT use the dark palette.
    await bootWidget(page, { client: 'amber', config: darkConfig });
    await openWidget(page);

    await expect(page.locator('.panel-header')).toHaveCSS('background-color', 'rgb(217, 119, 6)');
  });
});