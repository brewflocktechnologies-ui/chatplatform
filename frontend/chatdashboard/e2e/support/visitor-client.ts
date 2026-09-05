/**
 * Simulates a chat-widget visitor against the standalone WebSocket hub
 * (frontend/server/server.mjs). Speaks the exact wire protocol the dashboard's
 * ChatDashboardSocketClient and the hub implement: JSON frames of type
 * join / chat_message / typing_status / presence / ping.
 *
 * Uses Node's built-in global WebSocket (Node >= 22), so no extra dependency.
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
  private ws: WebSocket | null = null;
  private received: Frame[] = [];
  private waiters: { predicate: (f: Frame) => boolean; resolve: (f: Frame) => void }[] = [];

  readonly conversationId: string;

  constructor(
    readonly name: string,
    readonly tenantId = 'demo-tenant',
    conversationId?: string
  ) {
    this.conversationId =
      conversationId ??
      `e2e-conv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  }

  async connect(url: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(url);
      const timer = setTimeout(
        () => reject(new Error(`Visitor WS connect timeout: ${url}`)),
        10_000
      );
      ws.addEventListener('open', () => {
        clearTimeout(timer);
        resolve();
      });
      ws.addEventListener('error', () => {
        clearTimeout(timer);
        reject(new Error(`Visitor WS connect failed: ${url}`));
      });
      ws.addEventListener('message', (event) => {
        try {
          const frame = JSON.parse(String(event.data)) as Frame;
          this.received.push(frame);
          const matched = this.waiters.filter((w) => w.predicate(frame));
          this.waiters = this.waiters.filter((w) => !matched.includes(w));
          for (const waiter of matched) {
            waiter.resolve(frame);
          }
        } catch {
          // ignore non-JSON frames
        }
      });
      this.ws = ws;
    });
  }

  /** Join the visitor's room; the hub broadcasts an online presence to agents. */
  join(): void {
    this.send({
      type: 'join',
      tenantId: this.tenantId,
      conversationId: this.conversationId,
      role: 'visitor',
      senderName: this.name
    });
  }

  sendChatMessage(text: string): VisitorMessage {
    const message: VisitorMessage = {
      id: `e2e-msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      sender: 'user',
      author: this.name,
      text,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
    this.send({
      type: 'chat_message',
      tenantId: this.tenantId,
      conversationId: this.conversationId,
      senderName: this.name,
      message
    });
    return message;
  }

  sendTyping(isTyping: boolean): void {
    this.send({
      type: 'typing_status',
      tenantId: this.tenantId,
      conversationId: this.conversationId,
      isTyping,
      senderName: this.name
    });
  }

  /** Resolve with the first frame (past or future) matching the predicate. */
  waitForFrame(predicate: (f: Frame) => boolean, timeoutMs = 15_000): Promise<Frame> {
    const existing = this.received.find(predicate);
    if (existing) return Promise.resolve(existing);
    return new Promise<Frame>((resolve, reject) => {
      const waiter = {
        predicate,
        resolve: (f: Frame) => {
          clearTimeout(timer);
          resolve(f);
        }
      };
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((w) => w !== waiter);
        reject(
          new Error(
            `Timed out waiting for frame. Received so far: ${JSON.stringify(this.received.map((f) => f.type))}`
          )
        );
      }, timeoutMs);
      this.waiters.push(waiter);
    });
  }

  private send(frame: Frame): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Visitor socket is not open');
    }
    this.ws.send(JSON.stringify(frame));
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
  }
}
