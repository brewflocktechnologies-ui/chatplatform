import type { Locator, Page } from '@playwright/test';

/**
 * Accessible name of a sidebar link: the nav title, plus " API" for the tabs that read the
 * billing API (the visible "API" tag is part of the name, so the label contains the visible text).
 */
export function navLinkName(title: string): RegExp {
  const escaped = title.replaceAll(/[\\^$.*+?()[\]{}|]/g, String.raw`\$&`);
  return new RegExp(`^${escaped}( API)?$`);
}

/**
 * The chrome every dashboard page shares: sidebar navigation (nav-config.ts),
 * the footer user menu, and the kbar command palette.
 */
export class DashboardShell {
  constructor(readonly page: Page) {}

  /**
   * Sidebar entries render as links whose accessible name is the nav title (see `navLinkName`).
   * Scoped to the sidebar menu — the breadcrumb repeats some link names.
   */
  navLink(title: string): Locator {
    return this.page
      .locator('a[data-sidebar="menu-button"]')
      .and(this.page.getByRole('link', { name: navLinkName(title) }));
  }

  async navigateTo(title: string, expectedPath: string): Promise<void> {
    await this.navLink(title).click();
    // Use 'commit' (not the default 'load') so pages that open long-lived
    // async connections (e.g. the chat WebSocket) don't stall the URL check.
    await this.page.waitForURL(`**${expectedPath}`, { waitUntil: 'commit' });
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
    // The header no longer renders a Search button; the palette opens on
    // Cmd/Ctrl+K or the `kbar:open` window event (lazy-kbar.tsx). Wait for
    // hydration so the lazy listener is attached before the event fires.
    await this.page.waitForLoadState('networkidle');
    await this.page.evaluate(() => window.dispatchEvent(new Event('kbar:open')));
    const input = this.page.locator('input[aria-controls="kbar-listbox"]');
    await input.waitFor({ state: 'visible' });
    return input;
  }
}
