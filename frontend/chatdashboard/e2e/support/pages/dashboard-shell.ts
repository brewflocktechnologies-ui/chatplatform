import type { Locator, Page } from '@playwright/test';

/**
 * The chrome every dashboard page shares: sidebar navigation (nav-config.ts),
 * the footer user menu, and the kbar command palette.
 */
export class DashboardShell {
  constructor(readonly page: Page) {}

  /**
   * Sidebar entries render as links whose accessible name is the nav title.
   * Scoped to the sidebar menu — the breadcrumb repeats some link names.
   */
  navLink(title: string): Locator {
    return this.page
      .locator('a[data-sidebar="menu-button"]')
      .and(this.page.getByRole('link', { name: title, exact: true }));
  }

  async navigateTo(title: string, expectedPath: string): Promise<void> {
    await this.navLink(title).click();
    await this.page.waitForURL(`**${expectedPath}`);
  }

  async openUserMenu(): Promise<void> {
    // The footer trigger shows the signed-in user's name and email.
    await this.page.getByRole('button', { name: /demo@example\.com/i }).click();
  }

  async signOut(): Promise<void> {
    await this.openUserMenu();
    await this.page.getByRole('menuitem', { name: 'Sign out' }).click();
    await this.page.waitForURL('**/auth/sign-in');
  }

  async openKbar(): Promise<Locator> {
    await this.page.getByRole('button', { name: /Search/ }).click();
    const input = this.page.locator('input[aria-controls="kbar-listbox"]');
    await input.waitFor({ state: 'visible' });
    return input;
  }
}
