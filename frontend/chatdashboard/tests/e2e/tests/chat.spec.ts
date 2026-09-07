import { expect, test } from '../support/fixtures';
import { ChatPage } from '../support/pages/chat-page';
import { VisitorClient } from '../support/visitor-client';
import { uniqueName } from '../support/db';

/**
 * Live chat workflows — the core product journey, exercised end to end over
 * the real WebSocket hub (frontend/server/server.mjs, started by the
 * Playwright webServer config):
 *
 *   visitor socket  ⇄  ws hub (:8088)  ⇄  agent dashboard (this browser)
 *
 * Serial mode: every agent page subscribes to ALL demo-tenant traffic, so
 * concurrent chat tests would leak visitors into each other's conversation
 * lists. Visitor names are unique per test regardless.
 */

test.describe.configure({ mode: 'serial' });

test.describe('Live chat', () => {
  test('shows the empty state and connects to the hub', async ({ page }) => {
    const chat = new ChatPage(page);
    await chat.goto();

    await expect(page.getByText('Live Chat Platform')).toBeVisible();
    await chat.waitForConnected();
  });

  test('a visitor joining creates a conversation in the list', async ({ page, wsUrl }) => {
    const chat = new ChatPage(page);
    await chat.goto();
    await chat.waitForConnected();

    const visitor = new VisitorClient(uniqueName('Visitor'));
    try {
      await visitor.connect(wsUrl);
      visitor.join();

      await expect(chat.conversation(visitor.name)).toBeVisible();
      await expect(chat.conversation(visitor.name).getByText('No messages yet')).toBeVisible();
    } finally {
      visitor.close();
    }
  });

  test('an incoming visitor message renders in the conversation', async ({ page, wsUrl }) => {
    const chat = new ChatPage(page);
    await chat.goto();
    await chat.waitForConnected();

    const visitor = new VisitorClient(uniqueName('Visitor'));
    try {
      await visitor.connect(wsUrl);
      visitor.join();
      await expect(chat.conversation(visitor.name)).toBeVisible();

      const text = `Hello from e2e ${Date.now().toString(36)}`;
      visitor.sendChatMessage(text);

      // The first live conversation is auto-selected, so the message shows
      // both as the list snippet and in the open chat area.
      await expect(chat.conversation(visitor.name)).toContainText(text);
      await expect(page.getByText(text).nth(1)).toBeVisible();
    } finally {
      visitor.close();
    }
  });

  test('the agent reply reaches the visitor over the hub', async ({ page, wsUrl }) => {
    const chat = new ChatPage(page);
    await chat.goto();
    await chat.waitForConnected();

    const visitor = new VisitorClient(uniqueName('Visitor'));
    try {
      await visitor.connect(wsUrl);
      visitor.join();
      visitor.sendChatMessage('Need help with my order');
      await expect(chat.conversation(visitor.name)).toBeVisible();
      await chat.selectConversation(visitor.name);

      const reply = `Agent here ${Date.now().toString(36)}`;
      await chat.sendReply(visitor.name, reply);

      // The dashboard echoes the outgoing message locally…
      await expect(page.getByText(reply).first()).toBeVisible();
      // …and the visitor's socket receives the exact frame.
      const frame = await visitor.waitForFrame(
        (f) =>
          f.type === 'chat_message' && (f.message as { text?: string } | undefined)?.text === reply
      );
      expect((frame.message as { sender: string }).sender).toBe('user');
    } finally {
      visitor.close();
    }
  });

  test('visitor typing shows the typing indicator', async ({ page, wsUrl }) => {
    const chat = new ChatPage(page);
    await chat.goto();
    await chat.waitForConnected();

    const visitor = new VisitorClient(uniqueName('Visitor'));
    try {
      await visitor.connect(wsUrl);
      visitor.join();
      visitor.sendChatMessage('First message');
      await expect(chat.conversation(visitor.name)).toBeVisible();

      visitor.sendTyping(true);
      await expect(chat.conversation(visitor.name).getByText('typing...')).toBeVisible();

      visitor.sendTyping(false);
      await expect(chat.conversation(visitor.name).getByText('typing...')).toBeHidden();
    } finally {
      visitor.close();
    }
  });

  test('a second visitor gets a separate conversation with an unread badge', async ({
    page,
    wsUrl
  }) => {
    const chat = new ChatPage(page);
    await chat.goto();
    await chat.waitForConnected();

    const first = new VisitorClient(uniqueName('Visitor'));
    const second = new VisitorClient(uniqueName('Visitor'));
    try {
      await first.connect(wsUrl);
      first.join();
      first.sendChatMessage('First visitor message');
      await expect(chat.conversation(first.name)).toBeVisible();

      // The first conversation is selected; the second arrives in background.
      await second.connect(wsUrl);
      second.join();
      second.sendChatMessage('Second visitor message');

      await expect(chat.conversation(second.name)).toBeVisible();
      await expect(chat.conversation(second.name).getByText('1', { exact: true })).toBeVisible();

      // Selecting it clears the unread badge and opens its thread.
      await chat.selectConversation(second.name);
      await expect(chat.conversation(second.name).getByText('1', { exact: true })).toBeHidden();
      await expect(page.getByText('Second visitor message').nth(1)).toBeVisible();
    } finally {
      first.close();
      second.close();
    }
  });
});
