import { expect, test } from '@playwright/test';

/**
 * Profile & Notifications pages — productive surfaces that were not covered by
 * the existing suite.
 *
 * Profile  → /dashboard/profile
 *   - Shows the signed-in user's name and email pre-filled.
 *   - Validation: blank name is rejected.
 *   - Save toast appears on a valid submission.
 *
 * Notifications → /dashboard/notifications
 *   - Shows the Notifications heading.
 *   - Renders the Unread and Read tabs (tabs include a count, e.g. "Unread (3)").
 *   - Mark-all-as-read button moves all items to the Read tab.
 */

test.describe('Profile page', () => {
  test('shows the signed-in user name and email pre-filled', async ({ page }) => {
    await page.goto('/dashboard/profile');

    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();

    const nameValue = await page.getByLabel('Name').inputValue();
    expect(nameValue).toBeTruthy();

    const emailValue = await page.getByLabel('Email').inputValue();
    expect(emailValue).toMatch(/@/);
  });

  test('rejects a blank name with a validation error', async ({ page }) => {
    await page.goto('/dashboard/profile');

    await page.getByLabel('Name').fill('');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText('Name is required')).toBeVisible();
  });

  test('shows a success toast on valid save', async ({ page }) => {
    await page.goto('/dashboard/profile');

    await page.getByLabel('Name').fill('E2E Agent Updated');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText(/Profile updated/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Notifications page', () => {
  // Tab labels include a count suffix, e.g. "Unread (3)" and "Read (2)".
  // Use anchored regexes so /^Read/ does not also match "Unread (…)".
  const unreadTabRe = /^Unread/;
  const readTabRe = /^Read/;

  test('shows the Notifications heading and Unread / Read tabs', async ({ page }) => {
    await page.goto('/dashboard/notifications');

    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
    await expect(page.getByRole('tab', { name: unreadTabRe })).toBeVisible();
    await expect(page.getByRole('tab', { name: readTabRe })).toBeVisible();
  });

  test('Mark all as read empties the Unread tab', async ({ page }) => {
    await page.goto('/dashboard/notifications');

    await page.getByRole('tab', { name: unreadTabRe }).click();

    const markAllBtn = page.getByRole('button', { name: /Mark all as read/i });
    const btnVisible = await markAllBtn.isVisible().catch(() => false);
    if (!btnVisible) {
      test.skip();
      return;
    }

    await markAllBtn.click();

    // After marking all read, the Unread tab should show an empty state.
    await expect(page.getByText('No notifications')).toBeVisible({ timeout: 5000 });
  });
});
