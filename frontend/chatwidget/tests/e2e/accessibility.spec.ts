import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';
import { bootWidget, openWidget } from './helpers';

/**
 * Accessibility gates on the three states a visitor actually sees. Scans run
 * against the full shadow DOM of the widget; any serious/critical violation
 * fails the build. (Chromium-only: axe results are engine-independent, but
 * keeping the scan lean avoids redundancy across 4 projects.)
 */
test.describe('Accessibility', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Axe scans run on chromium only');

  async function seriousViolations(page: Parameters<typeof bootWidget>[0]) {
    // Scan the light-DOM root: axe traverses the widget's shadow DOM itself.
    const results = await new AxeBuilder({ page }).include('cw-widget-root').analyze();
    return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  }

  test('bubble idle state has no serious/critical violations', async ({ page }) => {
    await bootWidget(page, { client: 'amber' });
    await expect(page.locator('.bubble-wrapper')).toBeVisible();

    const violations = await seriousViolations(page);
    expect(
      violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`),
      `Unexpected a11y violations: ${JSON.stringify(violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help })), null, 2)}`,
    ).toEqual([]);
  });

  test('welcome card open has no serious/critical violations', async ({ page }) => {
    await bootWidget(page, { client: 'amber' });
    await openWidget(page);
    await expect(page.locator('cw-welcome-card')).toBeVisible();

    const violations = await seriousViolations(page);
    expect(
      violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`),
      `Unexpected a11y violations: ${JSON.stringify(violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help })), null, 2)}`,
    ).toEqual([]);
  });

  test('prechat form open has no serious/critical violations', async ({ page }) => {
    await bootWidget(page, { client: 'amber' });
    await openWidget(page);
    await page.getByRole('button', { name: 'Start Conversation' }).click();
    await expect(page.locator('cw-chat-form')).toBeVisible();

    const violations = await seriousViolations(page);
    expect(
      violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`),
      `Unexpected a11y violations: ${JSON.stringify(violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help })), null, 2)}`,
    ).toEqual([]);
  });
});