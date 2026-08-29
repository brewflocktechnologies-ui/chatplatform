import { test } from '@playwright/test';
import { bootWidget, loadClientConfig, openWidget } from './helpers';

/**
 * Actual visual regression: pixel baselines of the key widget states.
 *
 * Baselines are chromium-only (fonts/rendering differ per engine). Generate
 * or refresh them with `npm run test:e2e:update`.
 *
 * Determinism measures:
 *  - greet window pinned off (its delayed pop-in would shift pixels)
 *  - remote avatar images fulfilled with a blank PNG
 *  - clock/status-ticks inside .bubble-time masked (they change every run)
 */
test.describe('Visual regression', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Baselines are chromium-only');
  // Screenshot baselines are pixel-tied to the rendering platform (fonts,
  // subpixel AA). They are generated on Windows; the CI matrix runs on Linux
  // and covers the behavioral suite instead. Regenerate with `npm run test:e2e:update`.
  test.skip(process.platform !== 'win32', 'Baselines are generated on Windows');

  const BLANK_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  );

  const visualConfig = (): Record<string, unknown> => {
    const cfg = loadClientConfig('amber') as Record<string, any>;
    cfg.greetWindow = { ...(cfg.greetWindow || {}), enabled: false };
    if (cfg.greetWindow && cfg.greetWindow.inputBox) {
      cfg.greetWindow.inputBox = { ...cfg.greetWindow.inputBox, enabled: false };
    }
    return cfg;
  };

  test('bubble idle state', async ({ page }) => {
    await page.route('**pngtree**', (route) =>
      route.fulfill({ contentType: 'image/png', body: BLANK_PNG }),
    );
    await bootWidget(page, { client: 'amber', config: visualConfig() });
    await test.expect(page.locator('.bubble-wrapper')).toBeVisible();

    await test.expect(page).toHaveScreenshot('bubble-idle.png');
  });

  test('welcome card open', async ({ page }) => {
    await page.route('**pngtree**', (route) =>
      route.fulfill({ contentType: 'image/png', body: BLANK_PNG }),
    );
    await bootWidget(page, { client: 'amber', config: visualConfig() });
    await openWidget(page);
    await test.expect(page.locator('cw-welcome-card')).toBeVisible();

    await test.expect(page.locator('.zotly-widget-panel-wrapper')).toHaveScreenshot('welcome-open.png', {
      // Small tolerance: backdrop-filter/gradient pixels can vary per run.
      maxDiffPixelRatio: 0.02,
    });
  });

  test('prechat form', async ({ page }) => {
    await page.route('**pngtree**', (route) =>
      route.fulfill({ contentType: 'image/png', body: BLANK_PNG }),
    );
    await bootWidget(page, { client: 'amber', config: visualConfig() });
    await openWidget(page);
    await page.getByRole('button', { name: 'Start Conversation' }).click();
    await test.expect(page.locator('cw-chat-form')).toBeVisible();

    await test.expect(page.locator('.zotly-widget-panel-wrapper')).toHaveScreenshot('prechat-form.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

  test('active chat with a visitor message', async ({ page }) => {
    await page.route('**pngtree**', (route) =>
      route.fulfill({ contentType: 'image/png', body: BLANK_PNG }),
    );
    await bootWidget(page, { client: 'amber', config: visualConfig() });
    await openWidget(page);
    await page.getByRole('button', { name: 'Start Conversation' }).click();
    await page.locator('cw-chat-form input[placeholder="John Doe"]').fill('Jordan Smith');
    await page.locator('cw-chat-form input[placeholder="john@example.com"]').fill('jordan@example.com');
    await page.getByRole('button', { name: 'Start Chat' }).click();

    const composer = page.locator('cw-composer textarea');
    await composer.fill('Hello from the visual test');
    await composer.press('Enter');
    const visitorMsg = page.locator('.bubble-row.from-visitor .bubble');
    await test.expect(visitorMsg).toBeVisible();

    const panel = page.locator('.zotly-widget-panel-wrapper');
    await test.expect(panel).toHaveScreenshot('active-chat.png', {
      mask: [page.locator('.bubble-time')],
      maxDiffPixelRatio: 0.02,
    });
  });
});