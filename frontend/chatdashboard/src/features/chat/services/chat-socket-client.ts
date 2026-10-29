import { Centrifuge, Subscription, SubscriptionState } from 'centrifuge';
import type { Message } from '../utils/types';

export type SocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface JoinRoomOptions {
  tenantId: string;
  conversationId: string;
  role: 'agent' | 'visitor';
  senderName: string;
}

export interface SocketClientCallbacks {
  onMessage?: (data: { message: Message; conversationId: string; senderName?: string }) => void;
  onUpdateName?: (data: { conversationId: string; senderName: string }) => void;
  onTyping?: (data: { isTyping: boolean; senderName: string; conversationId?: string }) => void;
  onPresence?: (data: {
    status: 'online' | 'offline';
    role: string;
    senderName: string;
    conversationId?: string;
  }) => void;
  onStatusChange?: (status: SocketStatus) => void;
}

/**
 * Agent side of the Centrifugo link. Visitors and agents of a tenant share one
 * channel (`chat:<tenantId>`); every publication carries conversationId + role,
 * so the agent sees all visitors and ignores agent traffic (its own echo included).
 */
export class ChatDashboardSocketClient {
  private client: Centrifuge | null = null;
  private sub: Subscription | null = null;
  private url: string = '';
  private options: JoinRoomOptions | null = null;
  private callbacks: SocketClientCallbacks = {};
  private status: SocketStatus = 'disconnected';

  constructor(callbacks: SocketClientCallbacks = {}) {
    this.callbacks = callbacks;
  }

  get isConnected(): boolean {
    return this.status === 'connected' && this.sub?.state === SubscriptionState.Subscribed;
  }

  public setCallbacks(callbacks: SocketClientCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public connect(url: string, options: JoinRoomOptions) {
    if (typeof window === 'undefined' || !url) return;
    this.url = url;
    this.options = options;

    this.teardown();
    this.setStatus('connecting');

    const client = new Centrifuge(url, { minReconnectDelay: 1000, maxReconnectDelay: 15000 });
    const sub = client.newSubscription(`chat:${options.tenantId}`);

    client.on('connecting', () => this.setStatus('connecting'));
    client.on('disconnected', () => this.setStatus('disconnected'));
    client.on('error', (ctx) => {
      console.warn('[DashboardSocketClient] Connection error:', ctx.error);
      this.setStatus('error');
    });

    sub.on('subscribed', () => {
      console.log('[DashboardSocketClient] Connected to', this.url);
      this.setStatus('connected');
    });
    sub.on('publication', (ctx) => this.handlePublication(ctx.data));

    this.client = client;
    this.sub = sub;
    sub.subscribe();
    client.connect();
  }

  public disconnect() {
    this.teardown();
    this.setStatus('disconnected');
  }

  /** The tenant channel already delivers every conversation; only remember the active one. */
  public joinRoom(options: JoinRoomOptions) {
    this.options = options;
  }

  public sendMessage(message: Message, conversationId?: string) {
    this.publish({
      type: 'chat_message',
      conversationId: conversationId || this.options?.conversationId || 'general',
      senderName: this.options?.senderName || 'Support Agent',
      message
    });
  }

  public sendTyping(isTyping: boolean, conversationId?: string) {
    this.publish({
      type: 'typing_status',
      conversationId: conversationId || this.options?.conversationId || 'general',
      isTyping,
      senderName: this.options?.senderName || 'Support Agent'
    });
  }

  private publish(data: Record<string, unknown>) {
    if (this.sub?.state !== SubscriptionState.Subscribed) return;
    this.sub
      .publish({
        ...data,
        tenantId: this.options?.tenantId || 'demo-tenant',
        role: 'agent'
      })
      .catch((err) => console.warn('[DashboardSocketClient] Publish failed:', err));
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
    // Skip agent traffic: it is our own echo (or another agent's), not a visitor.
    if (!data || data.role === 'agent') return;

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

      case 'update_name':
        if (data.conversationId && data.senderName) {
          this.callbacks.onUpdateName?.({
            conversationId: data.conversationId,
            senderName: data.senderName
          });
        }
        break;

      case 'typing_status':
        this.callbacks.onTyping?.({
          isTyping: !!data.isTyping,
          senderName: data.senderName || 'Visitor',
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

export const chatDashboardSocket = new ChatDashboardSocketClient();
