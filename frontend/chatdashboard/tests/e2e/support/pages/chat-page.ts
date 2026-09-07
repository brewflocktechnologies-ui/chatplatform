import { expect, type Locator, type Page } from '@playwright/test';

/** The agent messenger at /dashboard/chat. */
export class ChatPage {
  constructor(readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/dashboard/chat');
  }

  /**
   * The empty state shows the socket status pill; wait until the dashboard's
   * agent socket has connected to the hub before driving visitors.
   */
  async waitForConnected(): Promise<void> {
    await expect(this.page.getByText('WebSocket: Connected & Listening')).toBeVisible({
      timeout: 20_000
    });
  }

  /** Conversation entry in the left-hand list (lg viewport only). */
  conversation(name: string): Locator {
    return this.page
      .locator('[aria-label="User conversations list"]')
      .getByRole('listitem')
      .filter({ hasText: name });
  }

  async selectConversation(name: string): Promise<void> {
    await this.conversation(name).click();
  }

  composer(contactName: string): Locator {
    return this.page.getByRole('textbox', { name: `Message ${contactName}` });
  }

  async sendReply(contactName: string, text: string): Promise<void> {
    const composer = this.composer(contactName);
    await composer.fill(text);
    await composer.press('Enter');
  }
}
