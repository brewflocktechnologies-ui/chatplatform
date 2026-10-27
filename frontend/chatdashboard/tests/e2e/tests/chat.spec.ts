import type { WebSocketRoute } from '@playwright/test';
import { expect, test } from '../support/fixtures';
import { ChatPage } from '../support/pages/chat-page';
import { VisitorClient } from '../support/visitor-client';
import { uniqueName } from '../support/db';

/**
 * Live chat workflows — the core product journey, exercised end to end over
 * a real Centrifugo server (localrun/centrifugo, started by the
 * Playwright webServer config):
 *
 *   visitor client  ⇄  Centrifugo (:8000)  ⇄  agent dashboard (this browser)
 *
 * Serial mode: every agent page subscribes to ALL demo-tenant traffic, so
 * concurrent chat tests would leak visitors into each other's conversation
 * lists. Visitor names are unique per test regardless. Keep ALL live-chat
 * tests in this one file so they stay on a single worker.
 */

test.describe.configure({ mode: 'serial' });

test.describe('Live chat', () => {
  test('shows the empty state and connects to Centrifugo', async ({ page }) => {
    const chat = new ChatPage(page);
    await chat.goto();

    await expect(page.getByText('Live Chat Platform')).toBeVisible();
    await chat.waitForConnected();
  });

  test('a visitor joining creates a conversation in the list', async ({
    page,
    wsUrl,
  }) => {
    const chat = new ChatPage(page);
    await chat.goto();
    await chat.waitForConnected();

    const visitor = new VisitorClient(uniqueName('Visitor'));
    try {
      await visitor.connect(wsUrl);
      visitor.join();

      await expect(chat.conversation(visitor.name)).toBeVisible();
      await expect(
        chat.conversation(visitor.name).getByText('No messages yet'),
      ).toBeVisible();
    } finally {
      visitor.close();
    }
  });

  test('an incoming visitor message renders in the conversation', async ({
    page,
    wsUrl,
  }) => {
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

  test('the agent reply reaches the visitor over Centrifugo', async ({
    page,
    wsUrl,
  }) => {
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
          f.type === 'chat_message' &&
          (f.message as { text?: string } | undefined)?.text === reply,
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
      await expect(
        chat.conversation(visitor.name).getByText('typing...'),
      ).toBeVisible();

      visitor.sendTyping(false);
      await expect(
        chat.conversation(visitor.name).getByText('typing...'),
      ).toBeHidden();
    } finally {
      visitor.close();
    }
  });

  test('a second visitor gets a separate conversation with an unread badge', async ({
    page,
    wsUrl,
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
      await expect(
        chat.conversation(second.name).getByText('1', { exact: true }),
      ).toBeVisible();

      // Selecting it clears the unread badge and opens its thread.
      await chat.selectConversation(second.name);
      await expect(
        chat.conversation(second.name).getByText('1', { exact: true }),
      ).toBeHidden();
      await expect(
        page.getByText('Second visitor message').nth(1),
      ).toBeVisible();
    } finally {
      first.close();
      second.close();
    }
  });
});

test.describe('Live chat presence and filters', () => {
  test('a visitor leaving goes offline and rejoining brings them back online', async ({
    page,
    wsUrl,
  }) => {
    const chat = new ChatPage(page);
    await chat.goto();
    await chat.waitForConnected();

    const visitor = new VisitorClient(uniqueName('Visitor'));
    try {
      await visitor.connect(wsUrl);
      visitor.join();
      await expect(
        chat.conversation(visitor.name).getByLabel('Online'),
      ).toBeVisible();

      visitor.leave();
      await expect(
        chat.conversation(visitor.name).getByLabel('Offline'),
      ).toBeVisible();
      // The conversation is kept, not removed, when the visitor leaves.
      await expect(chat.conversation(visitor.name)).toHaveCount(1);

      visitor.join();
      await expect(
        chat.conversation(visitor.name).getByLabel('Online'),
      ).toBeVisible();
      await expect(chat.conversation(visitor.name)).toHaveCount(1);
    } finally {
      visitor.close();
    }
  });

  test('the Online filter hides visitors who have left', async ({
    page,
    wsUrl,
  }) => {
    const chat = new ChatPage(page);
    await chat.goto();
    await chat.waitForConnected();

    const staying = new VisitorClient(uniqueName('Visitor'));
    const leaving = new VisitorClient(uniqueName('Visitor'));
    try {
      await staying.connect(wsUrl);
      await leaving.connect(wsUrl);
      staying.join();
      leaving.join();
      await expect(chat.conversation(staying.name)).toBeVisible();
      await expect(chat.conversation(leaving.name)).toBeVisible();

      leaving.leave();
      await expect(
        chat.conversation(leaving.name).getByLabel('Offline'),
      ).toBeVisible();

      await page.getByRole('button', { name: /^Online/ }).click();
      await expect(chat.conversation(staying.name)).toBeVisible();
      await expect(chat.conversation(leaving.name)).toBeHidden();

      await page.getByRole('button', { name: /^All/ }).click();
      await expect(chat.conversation(leaving.name)).toBeVisible();
    } finally {
      staying.close();
      leaving.close();
    }
  });

  test('the Unread filter only lists conversations with unread messages', async ({
    page,
    wsUrl,
  }) => {
    const chat = new ChatPage(page);
    await chat.goto();
    await chat.waitForConnected();

    const first = new VisitorClient(uniqueName('Visitor'));
    const second = new VisitorClient(uniqueName('Visitor'));
    try {
      await first.connect(wsUrl);
      first.join();
      first.sendChatMessage('Already open');
      await expect(chat.conversation(first.name)).toBeVisible();

      await second.connect(wsUrl);
      second.join();
      second.sendChatMessage('Waiting for a reply');
      await expect(
        chat.conversation(second.name).getByText('1', { exact: true }),
      ).toBeVisible();

      await page.getByRole('button', { name: /^Unread/ }).click();
      await expect(chat.conversation(second.name)).toBeVisible();
      await expect(chat.conversation(first.name)).toBeHidden();

      // Reading the conversation clears it from the Unread filter.
      await page.getByRole('button', { name: /^All/ }).click();
      await chat.selectConversation(second.name);
      await page.getByRole('button', { name: /^Unread/ }).click();
      await expect(chat.conversation(second.name)).toBeHidden();
    } finally {
      first.close();
      second.close();
    }
  });

  test('a visitor renaming themselves opens a separate conversation', async ({
    page,
    wsUrl,
  }) => {
    const chat = new ChatPage(page);
    await chat.goto();
    await chat.waitForConnected();

    const visitor = new VisitorClient(uniqueName('Visitor'));
    const newName = uniqueName('Renamed');
    try {
      await visitor.connect(wsUrl);
      visitor.join();
      await expect(chat.conversation(visitor.name)).toBeVisible();

      visitor.rename(newName);
      await expect(chat.conversation(newName)).toBeVisible();
      // The original conversation is never overwritten.
      await expect(chat.conversation(visitor.name)).toBeVisible();

      // Repeating the same name does not duplicate the conversation.
      visitor.rename(newName);
      await expect(chat.conversation(newName)).toHaveCount(1);
    } finally {
      visitor.close();
    }
  });

  test('several visitor messages render in the order they were sent', async ({
    page,
    wsUrl,
  }) => {
    const chat = new ChatPage(page);
    await chat.goto();
    await chat.waitForConnected();

    const visitor = new VisitorClient(uniqueName('Visitor'));
    try {
      await visitor.connect(wsUrl);
      visitor.join();
      await expect(chat.conversation(visitor.name)).toBeVisible();

      visitor.sendChatMessage('message one');
      visitor.sendChatMessage('message two');
      visitor.sendChatMessage('message three');

      await expect(
        page
          .getByLabel(`Message thread with ${visitor.name}`)
          .getByRole('group'),
      ).toHaveText([/message one/, /message two/, /message three/]);
    } finally {
      visitor.close();
    }
  });
});

test.describe('Live chat connectivity', () => {
  test('the dashboard reconnects after the realtime connection drops', async ({
    page,
    wsUrl,
  }) => {
    // Proxy the dashboard's websocket so the test can sever it on demand and
    // keep the next attempt pending until it chooses to let it through.
    let live: WebSocketRoute | null = null;
    let holdReconnects = false;
    const held: WebSocketRoute[] = [];
    await page.routeWebSocket(/\/connection\/websocket/, (ws) => {
      if (holdReconnects) {
        held.push(ws);
        return;
      }
      const server = ws.connectToServer();
      ws.onMessage((message) => server.send(message));
      server.onMessage((message) => ws.send(message));
      ws.onClose(() => void server.close());
      live = ws;
    });

    const chat = new ChatPage(page);
    await chat.goto();
    await chat.waitForConnected();

    holdReconnects = true;
    await live!.close();
    await expect(
      page.getByText('WebSocket: Connected & Listening'),
    ).toBeHidden();
    await expect(
      page.getByText(/^WebSocket: (connecting|disconnected)$/),
    ).toBeVisible();

    // Let the next attempt through: the agent resubscribes on its own.
    holdReconnects = false;
    await Promise.all(held.splice(0).map((ws) => ws.close()));
    await chat.waitForConnected();

    // Realtime delivery works again after the reconnect.
    const visitor = new VisitorClient(uniqueName('Visitor'));
    try {
      await visitor.connect(wsUrl);
      visitor.join();
      await expect(chat.conversation(visitor.name)).toBeVisible();
    } finally {
      visitor.close();
    }
  });

  test('two agents both receive the visitor, and both replies reach the visitor', async ({
    page,
    context,
    browser,
    baseURL,
    wsUrl,
  }) => {
    const secondContext = await browser.newContext({
      baseURL,
      storageState: await context.storageState(),
      viewport: { width: 1440, height: 900 },
    });
    const secondPage = await secondContext.newPage();
    const visitor = new VisitorClient(uniqueName('Visitor'));
    try {
      const agentA = new ChatPage(page);
      const agentB = new ChatPage(secondPage);
      await agentA.goto();
      await agentB.goto();
      await agentA.waitForConnected();
      await agentB.waitForConnected();

      await visitor.connect(wsUrl);
      visitor.join();
      const question = `Anyone there ${Date.now().toString(36)}`;
      visitor.sendChatMessage(question);

      for (const agent of [agentA, agentB]) {
        await expect(agent.conversation(visitor.name)).toBeVisible();
        await expect(agent.conversation(visitor.name)).toContainText(question);
      }

      const fromA = `Reply from agent A ${Date.now().toString(36)}`;
      await agentA.selectConversation(visitor.name);
      await agentA.sendReply(visitor.name, fromA);
      await visitor.waitForFrame(
        (f) =>
          f.type === 'chat_message' &&
          (f.message as { text?: string })?.text === fromA,
      );

      const fromB = `Reply from agent B ${Date.now().toString(36)}`;
      await agentB.selectConversation(visitor.name);
      await agentB.sendReply(visitor.name, fromB);
      await visitor.waitForFrame(
        (f) =>
          f.type === 'chat_message' &&
          (f.message as { text?: string })?.text === fromB,
      );
    } finally {
      visitor.close();
      await secondContext.close();
    }
  });
});
