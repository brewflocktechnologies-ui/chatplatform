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
      conversationId = `conv-${slug}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      sessionStorage.setItem('cw_conversation_id', conversationId);
    }

    return { visitorName, conversationId };
  } catch {
    const visitorName = generateRandomGuestName();
    return { visitorName, conversationId: `conv-${Date.now()}` };
  }
}

export class ChatWidgetSocketClient {
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
    return this.status === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }

  public setCallbacks(callbacks: SocketClientCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public connect(url: string, options?: Partial<JoinRoomOptions>) {
    if (typeof window === 'undefined' || !url) return;
    this.url = url;
    this.manualClose = false;

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

    this.setStatus('connecting');

    try {
      if (this.ws) {
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.onmessage = null;
        this.ws.close();
      }

      this.ws = new WebSocket(url);
      this.ws.onopen = this.handleOpen;
      this.ws.onmessage = this.handleMessage;
      this.ws.onclose = this.handleClose;
      this.ws.onerror = this.handleError;
    } catch (err) {
      console.warn('[ChatWidgetSocket] Connection error:', err);
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

    this.send({
      type: 'chat_message',
      tenantId: this.tenantId,
      conversationId: this.conversationId,
      senderName: author,
      message: payload
    });

    return payload;
  }

  public sendTyping(isTyping: boolean) {
    this.send({
      type: 'typing_status',
      tenantId: this.tenantId,
      conversationId: this.conversationId,
      isTyping,
      senderName: this.visitorName
    });
  }

  public sendUpdateName(newName: string) {
    this.visitorName = newName;
    this.send({
      type: 'update_name',
      tenantId: this.tenantId,
      conversationId: this.conversationId,
      senderName: newName
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
    console.info('[ChatWidgetSocket] Connected to', this.url);
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

        case 'pong':
          break;
      }
    } catch (err) {
      console.warn('[ChatWidgetSocket] Message parsing error:', err);
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
      if (this.url) {
        this.connect(this.url, this.options || undefined);
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

export const chatWidgetSocket = new ChatWidgetSocketClient();
