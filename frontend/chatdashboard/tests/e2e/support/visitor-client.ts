import { Centrifuge, SubscriptionState, type Subscription } from 'centrifuge';

/**
 * Simulates a chat-widget visitor against Centrifugo. Mirrors the widget's
 * ChatWidgetSocketClient: every visitor and agent of a tenant share the
 * channel `chat:<tenantId>`, and each publication carries tenantId,
 * conversationId and role so the dashboard can route it.
 *
 * Uses Node's built-in global WebSocket (Node >= 22) as the transport.
 */

type Frame = Record<string, unknown> & { type: string };

export interface VisitorMessage {
  id: string;
  sender: 'user';
  author: string;
  text: string;
  timestamp: string;
}

export class VisitorClient {
  private client: Centrifuge | null = null;
  private sub: Subscription | null = null;
  private received: Frame[] = [];
  private waiters: {
    predicate: (f: Frame) => boolean;
    resolve: (f: Frame) => void;
  }[] = [];

  readonly conversationId: string;

  constructor(
    readonly name: string,
    readonly tenantId = 'demo-tenant',
    conversationId?: string,
  ) {
    this.conversationId =
      conversationId ??
      `e2e-conv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  }

  /** Connect and wait until the tenant channel subscription is active. */
  async connect(url: string): Promise<void> {
    const client = new Centrifuge(url, { websocket: WebSocket });
    const sub = client.newSubscription(`chat:${this.tenantId}`);

    sub.on('publication', (ctx) => {
      const frame = ctx.data as Frame | null;
      if (!frame || typeof frame.type !== 'string') return;
      this.received.push(frame);
      const matched = this.waiters.filter((w) => w.predicate(frame));
      this.waiters = this.waiters.filter((w) => !matched.includes(w));
      for (const waiter of matched) {
        waiter.resolve(frame);
      }
    });

    this.client = client;
    this.sub = sub;

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Visitor connect timeout: ${url}`)),
        10_000,
      );
      sub.on('subscribed', () => {
        clearTimeout(timer);
        resolve();
      });
      sub.on('error', (ctx) => {
        clearTimeout(timer);
        reject(new Error(`Visitor subscribe failed: ${ctx.error?.message}`));
      });
      sub.subscribe();
      client.connect();
    });
  }

  /** Announce the visitor online; the dashboard creates the conversation from this. */
  join(): void {
    this.publish({ type: 'presence', status: 'online', senderName: this.name });
  }

  /** Announce the visitor offline without dropping the socket. */
  leave(): void {
    this.publish({
      type: 'presence',
      status: 'offline',
      senderName: this.name,
    });
  }

  /** Tell the dashboard the visitor now goes by another name (widget "update_name"). */
  rename(newName: string): void {
    this.publish({ type: 'update_name', senderName: newName });
  }

  sendChatMessage(text: string): VisitorMessage {
    const message: VisitorMessage = {
      id: `e2e-msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      sender: 'user',
      author: this.name,
      text,
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    this.publish({ type: 'chat_message', senderName: this.name, message });
    return message;
  }

  sendTyping(isTyping: boolean): void {
    this.publish({ type: 'typing_status', isTyping, senderName: this.name });
  }

  /** Resolve with the first frame (past or future) matching the predicate. */
  waitForFrame(
    predicate: (f: Frame) => boolean,
    timeoutMs = 15_000,
  ): Promise<Frame> {
    const existing = this.received.find(predicate);
    if (existing) return Promise.resolve(existing);
    return new Promise<Frame>((resolve, reject) => {
      const waiter = {
        predicate,
        resolve: (f: Frame) => {
          clearTimeout(timer);
          resolve(f);
        },
      };
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((w) => w !== waiter);
        reject(
          new Error(
            `Timed out waiting for frame. Received so far: ${JSON.stringify(this.received.map((f) => f.type))}`,
          ),
        );
      }, timeoutMs);
      this.waiters.push(waiter);
    });
  }

  private publish(data: Record<string, unknown>): void {
    if (!this.sub || this.sub.state !== SubscriptionState.Subscribed) {
      throw new Error('Visitor subscription is not active');
    }
    this.sub
      .publish({
        ...data,
        tenantId: this.tenantId,
        conversationId: this.conversationId,
        role: 'visitor',
      })
      .catch(() => {});
  }

  close(): void {
    if (this.sub) {
      // Let the dashboard drop the visitor like the widget does on unload.
      try {
        this.publish({
          type: 'presence',
          status: 'offline',
          senderName: this.name,
        });
      } catch {
        // already closed
      }
    }
    this.sub?.removeAllListeners();
    this.client?.removeAllListeners();
    this.client?.disconnect();
    this.sub = null;
    this.client = null;
  }
}
