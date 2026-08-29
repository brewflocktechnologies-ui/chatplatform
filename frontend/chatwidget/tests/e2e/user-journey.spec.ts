import { test, expect } from '@playwright/test';
import { bootWidget, openWidget } from './helpers';

/**
 * End-to-end product behavior from a visitor's perspective, across the whole
 * system: script-tag bootstrap -> config fetch -> bubble -> welcome card ->
 * prechat form -> message send -> agent auto-reply.
 */
test.describe('User journey', () => {
  test('visitor completes prechat, sends a message and receives the agent reply', async ({ page }) => {
    // Real amber config: prechat enabled, welcome card enabled.
    await bootWidget(page, { client: 'amber' });

    // 1. Bubble visible on the host page.
    const bubble = page.locator('.bubble-wrapper');
    await expect(bubble).toBeVisible();

    // 2. Open the panel -> welcome card (header is hidden here by design).
    await bubble.click();
    await expect(page.locator('.zotly-widget-panel-wrapper')).toBeVisible();
    await expect(page.locator('cw-welcome-card')).toBeVisible();

    // 3. Start the conversation -> prechat form; header brand appears now.
    await page.getByRole('button', { name: 'Start Conversation' }).click();
    await expect(page.locator('cw-chat-form')).toBeVisible();
    await expect(page.getByText('Please introduce yourself to start chatting.')).toBeVisible();
    await expect(page.locator('.panel-header .title-text')).toContainText('Vortex Studio Support');

    // 4. Complete the prechat form.
    await page.locator('cw-chat-form input[placeholder="John Doe"]').fill('Jordan Smith');
    await page.locator('cw-chat-form input[placeholder="john@example.com"]').fill('jordan@example.com');
    await page.getByRole('button', { name: 'Start Chat' }).click();

    // 5. Active chat composer appears.
    const composer = page.locator('cw-composer textarea');
    await expect(composer).toBeVisible();

    // 6. Send a message.
    const messageText = 'Hi! Do the AI pricing plans have a monthly option?';
    await composer.fill(messageText);
    await composer.press('Enter');

    // 7. The visitor's message shows up in the thread immediately.
    await expect(page.locator('.bubble-row.from-visitor .bubble')).toContainText(messageText);

    // 8. The agent auto-reply lands (client-side send/deliver/read/reply loop).
    await expect(page.getByText('Our team will contact you soon!')).toBeVisible({ timeout: 20_000 });

    // 9. Composer cleared, panel still open and usable.
    await expect(composer).toHaveValue('');
    await expect(page.locator('.zotly-widget-panel-wrapper')).toBeVisible();
  });

  test('prechat form blocks submission until required fields are valid', async ({ page }) => {
    await bootWidget(page, { client: 'amber' });
    await openWidget(page);
    await page.getByRole('button', { name: 'Start Conversation' }).click();
    await expect(page.locator('cw-chat-form')).toBeVisible();

    // Empty submit -> validation errors, still on the form.
    await page.getByRole('button', { name: 'Start Chat' }).click();
    await expect(page.getByText('Your Name is required')).toBeVisible();
    await expect(page.getByText('Email Address is required')).toBeVisible();
    await expect(page.locator('cw-composer')).not.toBeVisible();

    // Invalid email -> email validation, still blocked.
    await page.locator('cw-chat-form input[placeholder="John Doe"]').fill('Jordan Smith');
    await page.locator('cw-chat-form input[placeholder="john@example.com"]').fill('not-an-email');
    await page.getByRole('button', { name: 'Start Chat' }).click();
    await expect(page.getByText('Enter a valid email address')).toBeVisible();
    await expect(page.locator('cw-composer')).not.toBeVisible();

    // Fix it -> proceeds to chat.
    await page.locator('cw-chat-form input[placeholder="john@example.com"]').fill('jordan@example.com');
    await page.getByRole('button', { name: 'Start Chat' }).click();
    await expect(page.locator('cw-composer')).toBeVisible();
  });

  test('visitor can close the panel and reopen it without losing the session', async ({ page }) => {
    await bootWidget(page, { client: 'amber' });
    await openWidget(page);

    // Dismiss via Escape (same as a visitor pressing close / outside). The
    // widget only moves focus into the panel once the open transition finishes,
    // and its keydown listener lives on the widget root — so wait for focus to
    // land before pressing, or the keypress is dropped on body.
    await expect(page.locator('.panel')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('.zotly-widget-panel-wrapper')).toBeHidden();

    // Bubble is back and the panel reopens with the same welcome flow.
    await page.locator('.bubble-wrapper').click();
    await expect(page.locator('.zotly-widget-panel-wrapper')).toBeVisible();
    await expect(page.locator('cw-welcome-card')).toBeVisible();
  });
});