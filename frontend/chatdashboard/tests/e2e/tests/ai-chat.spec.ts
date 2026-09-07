import { expect, test } from '@playwright/test';

/**
 * AI Chat: a scripted demo streamed through the real useChat lifecycle
 * (no model behind it, fully deterministic — ideal for E2E).
 */

test.describe('AI Chat demo', () => {
  test('streams the scripted conversation turn by turn', async ({ page }) => {
    await page.goto('/dashboard/ai-chat');

    await expect(page.getByText('Release Assistant')).toBeVisible();
    await expect(page.getByText('Press Send to stream the conversation.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Restart' })).toBeDisabled();

    const send = page.getByRole('button', { name: 'Send next message' });
    await send.click();

    // Turn 1: user question, reasoning marker, tool call, streamed answer.
    // The tool marker shows 'Fetching revenue metrics' in flight and
    // 'Called getRevenue' once resolved — assert the stable final state.
    await expect(page.getByText('How did revenue do last month', { exact: false })).toBeVisible();
    await expect(page.getByText(/Called getRevenue/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Last month you brought in $1,250', { exact: false })).toBeVisible({
      timeout: 30_000
    });
    // Streaming finished: the demo is ready for the next scripted turn.
    await expect(page.getByRole('button', { name: 'Restart' })).toBeEnabled({ timeout: 30_000 });

    // Turn 2 streams the follow-up recommendation.
    await send.click();
    await expect(
      page.getByText('Where should I put my energy next?', { exact: false })
    ).toBeVisible();
    await expect(page.getByText('new-customer acquisition', { exact: false })).toBeVisible({
      timeout: 30_000
    });

    // The script has two turns; afterwards the demo reports its end.
    await expect(page.getByRole('button', { name: 'End of demo' })).toBeVisible({
      timeout: 30_000
    });
  });

  test('restart resets the conversation', async ({ page }) => {
    await page.goto('/dashboard/ai-chat');

    await page.getByRole('button', { name: 'Send next message' }).click();
    await expect(page.getByRole('button', { name: 'Restart' })).toBeEnabled({ timeout: 30_000 });

    await page.getByRole('button', { name: 'Restart' }).click();
    await expect(page.getByText('Press Send to stream the conversation.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send next message' })).toBeEnabled();
  });
});
