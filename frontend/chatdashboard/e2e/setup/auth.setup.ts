import { expect, test as setup } from '@playwright/test';
import { SignInPage } from '../support/pages/sign-in-page';

const AGENT_STATE = 'e2e/.auth/agent.json';

/**
 * Performs the real UI login once and captures the resulting browser state
 * (mock-auth stores the session under localStorage['mock_auth_user']).
 * Every test in the chromium project starts from this state.
 */
setup('authenticate as support agent', async ({ page }) => {
  const signIn = new SignInPage(page);
  await signIn.goto();
  await expect(signIn.heading).toBeVisible();
  await signIn.login('E2E Agent');

  await expect(page).toHaveURL(/\/dashboard\/overview/);
  await expect(page.getByRole('heading', { name: /Hi, Welcome back/ })).toBeVisible();

  await page.context().storageState({ path: AGENT_STATE });
});
