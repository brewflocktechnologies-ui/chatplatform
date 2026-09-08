import { expect, test } from '@playwright/test';
import { SignInPage } from '../support/pages/sign-in-page';

/**
 * Authentication workflows (mock auth: localStorage-backed session,
 * client-side AuthGuard on the dashboard layout).
 *
 * These tests must start signed out, so they opt out of the shared agent
 * storage state.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication', () => {
  test('unauthenticated visit to the dashboard redirects to sign-in', async ({ page }) => {
    await page.goto('/dashboard/overview');
    await page.waitForURL('**/auth/sign-in');
    await expect(new SignInPage(page).heading).toBeVisible();
  });

  test('root URL routes signed-out users to sign-in', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/auth/sign-in');
    await expect(new SignInPage(page).loginButton).toBeVisible();
  });

  test('legacy /sign-in route redirects to the live auth route', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForURL('**/auth/sign-in');
    await expect(new SignInPage(page).heading).toBeVisible();
  });

  test('signing in with a name lands on the overview and shows the user in the sidebar', async ({
    page
  }) => {
    const signIn = new SignInPage(page);
    await signIn.goto();
    await signIn.login('Priya QA');

    await expect(page).toHaveURL(/\/dashboard\/overview/);
    await expect(page.getByRole('heading', { name: /Hi, Welcome back/ })).toBeVisible();
    // Sidebar footer shows the signed-in identity.
    await expect(page.getByRole('button', { name: /Priya QA/ })).toBeVisible();
  });

  test('submitting the login form without a name shows validation feedback', async ({ page }) => {
    const signIn = new SignInPage(page);
    await signIn.goto();
    await signIn.nameInput.fill('');
    await signIn.loginButton.click();

    await expect(page.getByText('Name is required')).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test('signing out clears the session and re-locks the dashboard', async ({ page }) => {
    const signIn = new SignInPage(page);
    await signIn.goto();
    await signIn.login('Signout Tester');

    await page.getByRole('button', { name: /Signout Tester/ }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await page.waitForURL('**/auth/sign-in');

    const session = await page.evaluate(() => localStorage.getItem('mock_auth_user'));
    expect(session).toBeNull();

    // The guard must block a direct return to the dashboard.
    await page.goto('/dashboard/overview');
    await page.waitForURL('**/auth/sign-in');
  });
});
