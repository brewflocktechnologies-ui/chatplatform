import type { Locator, Page } from '@playwright/test';

/** The live sign-in route (/auth/sign-in) rendering MockLoginForm. */
export class SignInPage {
  readonly heading: Locator;
  readonly nameInput: Locator;
  readonly loginButton: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Sign in to your account' });
    this.nameInput = page.getByLabel('Name');
    this.loginButton = page.getByRole('button', { name: 'Login (Demo)' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/auth/sign-in');
  }

  async login(name: string): Promise<void> {
    await this.nameInput.fill(name);
    await this.loginButton.click();
    await this.page.waitForURL('**/dashboard/overview');
  }
}
