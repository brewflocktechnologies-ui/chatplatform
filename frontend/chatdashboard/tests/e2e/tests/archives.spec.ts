import { expect, test } from '../support/fixtures';

/**
 * Archives (/dashboard/archives) — three-pane archived-chat viewer backed by
 * in-repo mock data (src/constants/mock-api-archives.ts). All state is
 * client-side, so nothing here persists and tests are fully isolated.
 */

test.describe('Archives', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/archives');
    await expect(page.getByPlaceholder('Search in archives...')).toBeVisible();
  });

  test('lists archived chats with the total count and opens chat-5 by default', async ({
    page
  }) => {
    await expect(page.getByRole('heading', { name: 'Archives', exact: true })).toBeVisible();
    await expect(page.getByText('1,328 chats')).toBeVisible();
    // 6 mock chats render as selectable cards.
    await expect(page.getByRole('button').filter({ hasText: /Agent: Dan/ })).toHaveCount(6);

    await expect(page.getByRole('heading', { name: 'Test 10.11 and Dan' })).toBeVisible();
    await expect(page.getByText('Pre-chat form').first()).toBeVisible();
  });

  test('search filters the list and shows an empty state with no matches', async ({ page }) => {
    const search = page.getByPlaceholder('Search in archives...');
    const cards = page.getByRole('button').filter({ hasText: /Agent: Dan/ });

    await search.fill('Unnamed');
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText('Unnamed customer');

    await search.fill('zzz-no-such-chat');
    await expect(page.getByText('No archived chats match your filter.')).toBeVisible();
    await expect(cards).toHaveCount(0);

    // The inline clear button resets the query.
    await page.locator('button:has(svg) >> xpath=../input/following-sibling::button').click();
    await expect(search).toHaveValue('');
    await expect(cards).toHaveCount(6);
  });

  test('tag filter narrows to tagged chats and can be cleared', async ({ page }) => {
    const cards = page.getByRole('button').filter({ hasText: /Agent: Dan/ });

    await page.getByRole('button', { name: 'Add filter' }).click();
    await page.getByRole('button', { name: 'botengine-transfer', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Filter: botengine-transfer' })).toBeVisible();
    await expect(cards).toHaveCount(1);

    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    await expect(cards).toHaveCount(6);
  });

  test('sort toggles between newest and oldest ordering', async ({ page }) => {
    const cards = page.getByRole('button').filter({ hasText: /Agent: Dan/ });
    const sort = page.getByRole('button', { name: 'Sort chats' });

    await expect(sort).toContainText('Newest');
    const newestFirst = await cards.first().innerText();

    await sort.click();
    await page.getByRole('menuitem', { name: 'Oldest' }).click();
    await expect(sort).toContainText('Oldest');
    await expect(cards.first()).not.toHaveText(newestFirst);
  });

  test('previous/next chat buttons walk between a customer’s chats', async ({ page }) => {
    const prev = page.getByRole('button', { name: /Previous chat with this customer/ });
    const next = page.getByRole('button', { name: /Next chat with this customer/ });

    // chat-5 has a previous chat (chat-6) but no next one.
    await expect(prev).toBeEnabled();
    await expect(next).toBeDisabled();

    await prev.click();
    await expect(next).toBeEnabled();
    await expect(prev).toBeDisabled();
    // chat-6's snippet is distinct from chat-5's.
    await expect(page.getByText('sss').first()).toBeVisible();

    await next.click();
    await expect(prev).toBeEnabled();
    await expect(next).toBeDisabled();
  });

  test('tags can be added and removed on the open chat', async ({ page }) => {
    const tag = `e2e-${Date.now().toString(36)}`;

    await page.getByRole('button', { name: 'Add tag' }).click();
    await page.getByPlaceholder('e.g. priority, complaint').fill(tag);
    await page.getByRole('button', { name: 'Add', exact: true }).click();

    const badge = page.locator('[data-slot="badge"]').filter({ hasText: tag });
    await expect(badge.first()).toBeVisible();

    await badge.last().getByTitle('Remove tag').click();
    await expect(page.locator('[data-slot="badge"]').filter({ hasText: tag })).toHaveCount(0);
  });

  test('details panel: customer info, notes, canned responses and apps tabs', async ({ page }) => {
    // Customer details (default tab)
    await expect(page.getByText('General info')).toBeVisible();
    await expect(page.getByText('V91AL88ZX1').or(page.getByText('Chat ID:'))).toBeVisible();

    // Notes & canned responses
    await page.getByRole('button', { name: 'Notes & Canned Responses' }).click();
    await expect(page.getByText('Internal Notes')).toBeVisible();
    await expect(page.getByText('Customer reached out regarding API integration')).toBeVisible();

    const note = `E2E note ${Date.now().toString(36)}`;
    await page.getByPlaceholder('Leave a private note about this chat or customer...').fill(note);
    await page.getByRole('button', { name: 'Add Note' }).click();
    await expect(page.getByText('Note added successfully')).toBeVisible();
    await expect(page.getByText(note)).toBeVisible();

    // Canned responses are searchable.
    await page.getByPlaceholder('Search canned responses...').fill('wrap');
    await expect(page.getByText('Chat Wrap-up')).toBeVisible();
    await expect(page.getByText('Greeting & Welcome')).toHaveCount(0);

    // Apps & integrations
    await page.getByRole('button', { name: 'Apps & Integrations' }).click();
    await expect(page.getByText('Connected Apps')).toBeVisible();
    await expect(page.getByText('HubSpot CRM')).toBeVisible();
    await expect(page.getByText('Jira Software')).toBeVisible();
  });

  test('details panel can be hidden and reopened from the rail', async ({ page }) => {
    await page.getByRole('button', { name: 'Hide Details Panel' }).click();
    await expect(page.getByText('General info')).toHaveCount(0);

    await page.getByRole('button', { name: 'Open Details Panel' }).click();
    await expect(page.getByText('General info')).toBeVisible();
  });
});
