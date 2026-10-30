import { Centrifuge, Subscription, SubscriptionState } from 'centrifuge';

/**
 * WebSocket Client Service for Chat Widget
 * Handles connection, random visitor identity, rooms, and real-time bidirectional messaging
 * with the ChatPlatform WebSocket Hub and Next.js Chat Dashboard.
 */

export type SocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface JoinRoomOptions {
  tenantId: string;
  conversationId: string;
  role: 'visitor' | 'agent';
  senderName: string;
}

export interface SocketMessagePayload {
  id: string;
  sender: 'user' | 'agent' | 'system';
  author: string;
  text: string;
  timestamp: string;
  attachments?: Array<{ id: string; name: string; size: number; type: string }>;
}

export interface SocketClientCallbacks {
  onMessage?: (data: { message: SocketMessagePayload; conversationId: string; senderName?: string }) => void;
  onTyping?: (data: { isTyping: boolean; senderName: string; conversationId?: string }) => void;
  onPresence?: (data: { status: 'online' | 'offline'; role: string; senderName: string; conversationId?: string }) => void;
  onStatusChange?: (status: SocketStatus) => void;
}

export function generateRandomGuestName(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `Guest #${num}`;
}

export function getOrCreateVisitorIdentity(): { visitorName: string; conversationId: string } {
  if (typeof window === 'undefined') {
    return { visitorName: 'Guest #1000', conversationId: 'conv-guest-1000' };
  }

  try {
    let visitorName = sessionStorage.getItem('cw_visitor_name');
    let conversationId = sessionStorage.getItem('cw_conversation_id');

    if (!visitorName || !visitorName.startsWith('Guest #')) {
      visitorName = generateRandomGuestName();
      sessionStorage.setItem('cw_visitor_name', visitorName);
    }

    if (!conversationId) {
      const slug = visitorName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      conversationId = `conv-${slug}-${Date.now().toString(36)}-${crypto.randomUUID()}`;
      sessionStorage.setItem('cw_conversation_id', conversationId);
    }

    return { visitorName, conversationId };
  } catch {
    const visitorName = generateRandomGuestName();
    return { visitorName, conversationId: `conv-${Date.now()}` };
  }
}

export class ChatWidgetSocketClient {
  private client: Centrifuge | null = null;
  private sub: Subscription | null = null;
  private options: JoinRoomOptions | null = null;
  private callbacks: SocketClientCallbacks = {};
  private status: SocketStatus = 'disconnected';
  private url: string = '';

  public visitorName: string = '';
  public conversationId: string = '';
  public tenantId: string = 'demo-tenant';

  constructor(callbacks: SocketClientCallbacks = {}) {
    this.callbacks = callbacks;
    const identity = getOrCreateVisitorIdentity();
    this.visitorName = identity.visitorName;
    this.conversationId = identity.conversationId;
  }

  get isConnected(): boolean {
    return this.status === 'connected' && this.sub?.state === SubscriptionState.Subscribed;
  }

  public setCallbacks(callbacks: SocketClientCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public connect(url: string, options?: Partial<JoinRoomOptions>) {
    if (typeof window === 'undefined' || !url) return;
    this.url = url;

    if (options?.tenantId) this.tenantId = options.tenantId;
    if (options?.conversationId) this.conversationId = options.conversationId;
    if (options?.senderName) this.visitorName = options.senderName;

    this.options = {
      tenantId: this.tenantId,
      conversationId: this.conversationId,
      role: 'visitor',
      senderName: this.visitorName,
      ...options
    };

    this.teardown();
    this.setStatus('connecting');

    const client = new Centrifuge(url, { minReconnectDelay: 1000, maxReconnectDelay: 15000 });
    const sub = client.newSubscription(this.channel());

    client.on('connecting', () => this.setStatus('connecting'));
    client.on('disconnected', () => this.setStatus('disconnected'));
    client.on('error', (ctx) => {
      console.warn('[ChatWidgetSocket] Connection error:', ctx.error);
      this.setStatus('error');
    });

    sub.on('subscribed', () => {
      console.info('[ChatWidgetSocket] Connected to', this.url);
      this.setStatus('connected');
      this.publishPresence('online');
    });
    sub.on('publication', (ctx) => this.handlePublication(ctx.data));

    this.client = client;
    this.sub = sub;
    sub.subscribe();
    client.connect();
  }

  public disconnect() {
    // Let the offline notice flush before the socket closes.
    const flushed = this.publishPresence('offline') ?? Promise.resolve();
    flushed.finally(() => {
      this.teardown();
      this.setStatus('disconnected');
    });
  }

  public joinRoom(options: JoinRoomOptions) {
    this.options = options;
    this.tenantId = options.tenantId;
    this.conversationId = options.conversationId;
    this.visitorName = options.senderName;
    if (this.isConnected) {
      this.publishPresence('online');
    }
  }

  public sendMessage(text: string, senderName?: string) {
    const author = senderName || this.visitorName;
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const payload: SocketMessagePayload = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender: 'user',
      author,
      text,
      timestamp
    };

    this.publish({ type: 'chat_message', senderName: author, message: payload });

    return payload;
  }

  public sendTyping(isTyping: boolean) {
    this.publish({ type: 'typing_status', isTyping, senderName: this.visitorName });
  }

  public sendUpdateName(newName: string) {
    this.visitorName = newName;
    this.publish({ type: 'update_name', senderName: newName });
  }

  private channel(): string {
    return `chat:${this.tenantId}`;
  }

  private publishPresence(status: 'online' | 'offline') {
    return this.publish({ type: 'presence', status, senderName: this.visitorName });
  }

  /** Every visitor and agent of a tenant shares one channel; conversationId + role route it. */
  private publish(data: Record<string, unknown>): Promise<unknown> | undefined {
    if (!this.sub || this.sub.state !== SubscriptionState.Subscribed) return undefined;
    return this.sub
      .publish({
        ...data,
        tenantId: this.tenantId,
        conversationId: this.conversationId,
        role: 'visitor'
      })
      .catch((err) => console.warn('[ChatWidgetSocket] Publish failed:', err));
  }

  private teardown() {
    if (this.sub) {
      this.sub.removeAllListeners();
      this.sub.unsubscribe();
      this.sub = null;
    }
    if (this.client) {
      this.client.removeAllListeners();
      this.client.disconnect();
      this.client = null;
    }
  }

  private setStatus(status: SocketStatus) {
    if (this.status !== status) {
      this.status = status;
      this.callbacks.onStatusChange?.(status);
    }
  }

  private handlePublication(data: any) {
    // Centrifugo echoes our own publications back, and other visitors share the
    // tenant channel: only agent traffic for this conversation is relevant.
    if (!data || data.role !== 'agent' || data.conversationId !== this.conversationId) return;

    switch (data.type) {
      case 'chat_message':
        if (data.message) {
          this.callbacks.onMessage?.({
            message: data.message,
            conversationId: data.conversationId,
            senderName: data.senderName
          });
        }
        break;

      case 'typing_status':
        this.callbacks.onTyping?.({
          isTyping: !!data.isTyping,
          senderName: data.senderName || 'Support Agent',
          conversationId: data.conversationId
        });
        break;

      case 'presence':
        this.callbacks.onPresence?.({
          status: data.status,
          role: data.role,
          senderName: data.senderName,
          conversationId: data.conversationId
        });
        break;
    }
  }
}

export const chatWidgetSocket = new ChatWidgetSocketClient();
