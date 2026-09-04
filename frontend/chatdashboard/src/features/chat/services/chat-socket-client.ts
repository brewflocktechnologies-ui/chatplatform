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
  onPresence?: (data: { status: 'online' | 'offline'; role: string; senderName: string; conversationId?: string }) => void;
  onStatusChange?: (status: SocketStatus) => void;
}

export class ChatDashboardSocketClient {
  private ws: WebSocket | null = null;
  private url: string = '';
  private options: JoinRoomOptions | null = null;
  private callbacks: SocketClientCallbacks = {};
  private status: SocketStatus = 'disconnected';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private manualClose: boolean = false;

  constructor(callbacks: SocketClientCallbacks = {}) {
    this.callbacks = callbacks;
  }

  get isConnected(): boolean {
    return this.status === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }

  public setCallbacks(callbacks: SocketClientCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public connect(url: string, options: JoinRoomOptions) {
    if (typeof window === 'undefined' || !url) return;
    this.url = url;
    this.options = options;
    this.manualClose = false;

    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = this.handleOpen;
      this.ws.onmessage = this.handleMessage;
      this.ws.onclose = this.handleClose;
      this.ws.onerror = this.handleError;
    } catch (err) {
      console.warn('[DashboardSocketClient] Connection error:', err);
      this.setStatus('error');
      this.scheduleReconnect();
    }
  }

  public disconnect() {
    this.manualClose = true;
    this.clearTimers();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  public joinRoom(options: JoinRoomOptions) {
    this.options = options;
    if (this.isConnected) {
      this.send({
        type: 'join',
        tenantId: options.tenantId,
        conversationId: options.conversationId,
        role: options.role,
        senderName: options.senderName
      });
    }
  }

  public sendMessage(message: Message, conversationId?: string) {
    const convoId = conversationId || this.options?.conversationId || 'general';
    this.send({
      type: 'chat_message',
      tenantId: this.options?.tenantId || 'demo-tenant',
      conversationId: convoId,
      senderName: this.options?.senderName || 'Support Agent',
      message
    });
  }

  public sendTyping(isTyping: boolean, conversationId?: string) {
    const convoId = conversationId || this.options?.conversationId || 'general';
    this.send({
      type: 'typing_status',
      tenantId: this.options?.tenantId || 'demo-tenant',
      conversationId: convoId,
      isTyping,
      senderName: this.options?.senderName || 'Support Agent'
    });
  }

  private send(data: unknown) {
    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private setStatus(status: SocketStatus) {
    if (this.status !== status) {
      this.status = status;
      this.callbacks.onStatusChange?.(status);
    }
  }

  private handleOpen = () => {
    console.log('[DashboardSocketClient] Connected to', this.url);
    this.setStatus('connected');
    this.reconnectAttempts = 0;

    if (this.options) {
      this.joinRoom(this.options);
    }

    this.startPing();
  };

  private handleMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);

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

        case 'pong':
          break;
      }
    } catch (err) {
      console.warn('[DashboardSocketClient] Message parsing error:', err);
    }
  };

  private handleClose = () => {
    this.clearTimers();
    if (!this.manualClose) {
      this.setStatus('disconnected');
      this.scheduleReconnect();
    }
  };

  private handleError = () => {
    this.setStatus('error');
  };

  private scheduleReconnect() {
    if (this.manualClose || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      if (this.url && this.options) {
        this.connect(this.url, this.options);
      }
    }, delay);
  }

  private startPing() {
    this.clearTimers();
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 25000);
  }

  private clearTimers() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

export const chatDashboardSocket = new ChatDashboardSocketClient();
