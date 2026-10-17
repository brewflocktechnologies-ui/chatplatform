import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ChatDashboardSocketClient,
  chatDashboardSocket,
  type JoinRoomOptions,
  type SocketStatus
} from '@/features/chat/services/chat-socket-client';
import type { Message } from '@/features/chat/utils/types';

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  readyState = FakeWebSocket.CONNECTING;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn(() => {
    this.readyState = FakeWebSocket.CLOSED;
  });

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  receive(payload: unknown) {
    this.onmessage?.({ data: typeof payload === 'string' ? payload : JSON.stringify(payload) });
  }

  drop() {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  }

  get messages() {
    return this.sent.map((s) => JSON.parse(s));
  }
}

const options: JoinRoomOptions = {
  tenantId: 't1',
  conversationId: 'c1',
  role: 'agent',
  senderName: 'Sam'
};
const message = { id: 'm1', text: 'hi' } as unknown as Message;
const URL = 'ws://chat.test';

const latest = () => FakeWebSocket.instances.at(-1)!;

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.useFakeTimers();
  vi.stubGlobal('WebSocket', FakeWebSocket);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('connect', () => {
  it('opens a socket, reports status, and joins the room on open', () => {
    const statuses: SocketStatus[] = [];
    const client = new ChatDashboardSocketClient({ onStatusChange: (s) => statuses.push(s) });

    client.connect(URL, options);
    expect(latest().url).toBe(URL);
    expect(statuses).toEqual(['connecting']);
    expect(client.isConnected).toBe(false);

    latest().open();

    expect(statuses).toEqual(['connecting', 'connected']);
    expect(client.isConnected).toBe(true);
    expect(latest().messages).toEqual([{ type: 'join', ...options }]);
  });

  it('does nothing without a url', () => {
    const client = new ChatDashboardSocketClient();
    client.connect('', options);
    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  it('reports an error and schedules a reconnect when the constructor throws', () => {
    const statuses: SocketStatus[] = [];
    const client = new ChatDashboardSocketClient({ onStatusChange: (s) => statuses.push(s) });
    vi.stubGlobal(
      'WebSocket',
      class {
        constructor() {
          throw new Error('blocked');
        }
      }
    );

    client.connect(URL, options);
    expect(statuses).toEqual(['connecting', 'error']);

    vi.stubGlobal('WebSocket', FakeWebSocket);
    vi.advanceTimersByTime(1000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('marks the status as error when the socket errors', () => {
    const statuses: SocketStatus[] = [];
    const client = new ChatDashboardSocketClient({ onStatusChange: (s) => statuses.push(s) });
    client.connect(URL, options);
    latest().onerror?.();
    expect(statuses.at(-1)).toBe('error');
  });
});

describe('sending', () => {
  function connected() {
    const client = new ChatDashboardSocketClient();
    client.connect(URL, options);
    latest().open();
    latest().sent.length = 0;
    return client;
  }

  it('sends chat messages with the joined tenant and sender', () => {
    const client = connected();
    client.sendMessage(message, 'c9');
    expect(latest().messages).toEqual([
      {
        type: 'chat_message',
        tenantId: 't1',
        conversationId: 'c9',
        senderName: 'Sam',
        message
      }
    ]);
  });

  it('defaults to the joined conversation', () => {
    const client = connected();
    client.sendMessage(message);
    expect(latest().messages[0].conversationId).toBe('c1');
  });

  it('sends typing status', () => {
    const client = connected();
    client.sendTyping(true);
    expect(latest().messages).toEqual([
      {
        type: 'typing_status',
        tenantId: 't1',
        conversationId: 'c1',
        isTyping: true,
        senderName: 'Sam'
      }
    ]);
  });

  it('falls back to demo defaults before any room is joined', () => {
    const client = new ChatDashboardSocketClient();
    client.sendMessage(message);
    client.sendTyping(false);
    // Nothing is connected, so nothing is sent (and nothing throws).
    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  it('uses demo defaults when connected without options', () => {
    const client = new ChatDashboardSocketClient();
    client.connect(URL, options);
    latest().open();
    (client as unknown as { options: null }).options = null;
    latest().sent.length = 0;

    client.sendMessage(message);
    client.sendTyping(true);

    expect(latest().messages[0]).toMatchObject({
      tenantId: 'demo-tenant',
      conversationId: 'general',
      senderName: 'Support Agent'
    });
    expect(latest().messages[1]).toMatchObject({
      tenantId: 'demo-tenant',
      conversationId: 'general',
      senderName: 'Support Agent'
    });
  });

  it('drops messages while disconnected', () => {
    const client = new ChatDashboardSocketClient();
    client.connect(URL, options);
    // still CONNECTING
    client.sendMessage(message);
    expect(latest().sent).toEqual([]);
  });

  it('joinRoom re-joins when connected and only records options otherwise', () => {
    const client = new ChatDashboardSocketClient();
    client.joinRoom(options);
    expect(FakeWebSocket.instances).toHaveLength(0);

    client.connect(URL, options);
    latest().open();
    latest().sent.length = 0;
    client.joinRoom({ ...options, conversationId: 'c2' });
    expect(latest().messages).toEqual([{ type: 'join', ...options, conversationId: 'c2' }]);
  });
});

describe('receiving', () => {
  function setup() {
    const cb = {
      onMessage: vi.fn(),
      onUpdateName: vi.fn(),
      onTyping: vi.fn(),
      onPresence: vi.fn()
    };
    const client = new ChatDashboardSocketClient(cb);
    client.connect(URL, options);
    latest().open();
    return { cb, client };
  }

  it('dispatches chat messages', () => {
    const { cb } = setup();
    latest().receive({ type: 'chat_message', message, conversationId: 'c1', senderName: 'Vic' });
    expect(cb.onMessage).toHaveBeenCalledWith({
      message,
      conversationId: 'c1',
      senderName: 'Vic'
    });
  });

  it('ignores chat messages without a body', () => {
    const { cb } = setup();
    latest().receive({ type: 'chat_message', conversationId: 'c1' });
    expect(cb.onMessage).not.toHaveBeenCalled();
  });

  it('dispatches name updates only when complete', () => {
    const { cb } = setup();
    latest().receive({ type: 'update_name', conversationId: 'c1', senderName: 'Vic' });
    latest().receive({ type: 'update_name', conversationId: 'c1' });
    expect(cb.onUpdateName).toHaveBeenCalledTimes(1);
    expect(cb.onUpdateName).toHaveBeenCalledWith({ conversationId: 'c1', senderName: 'Vic' });
  });

  it('dispatches typing status with a Visitor fallback', () => {
    const { cb } = setup();
    latest().receive({ type: 'typing_status', isTyping: 1, conversationId: 'c1' });
    expect(cb.onTyping).toHaveBeenCalledWith({
      isTyping: true,
      senderName: 'Visitor',
      conversationId: 'c1'
    });
  });

  it('dispatches presence', () => {
    const { cb } = setup();
    latest().receive({
      type: 'presence',
      status: 'online',
      role: 'visitor',
      senderName: 'Vic',
      conversationId: 'c1'
    });
    expect(cb.onPresence).toHaveBeenCalledWith({
      status: 'online',
      role: 'visitor',
      senderName: 'Vic',
      conversationId: 'c1'
    });
  });

  it('ignores pong and unknown events', () => {
    const { cb } = setup();
    latest().receive({ type: 'pong' });
    latest().receive({ type: 'mystery' });
    expect(cb.onMessage).not.toHaveBeenCalled();
    expect(cb.onTyping).not.toHaveBeenCalled();
  });

  it('survives malformed frames', () => {
    const { cb } = setup();
    expect(() => latest().receive('{not json')).not.toThrow();
    expect(cb.onMessage).not.toHaveBeenCalled();
  });

  it('setCallbacks merges with existing callbacks', () => {
    const { cb, client } = setup();
    const onTyping = vi.fn();
    client.setCallbacks({ onTyping });

    latest().receive({ type: 'typing_status', isTyping: true });
    latest().receive({ type: 'chat_message', message });

    expect(onTyping).toHaveBeenCalled();
    expect(cb.onTyping).not.toHaveBeenCalled();
    expect(cb.onMessage).toHaveBeenCalled();
  });
});

describe('keep-alive', () => {
  it('pings every 25 seconds once connected', () => {
    const client = new ChatDashboardSocketClient();
    client.connect(URL, options);
    latest().open();
    latest().sent.length = 0;

    vi.advanceTimersByTime(25_000);
    expect(latest().messages).toEqual([{ type: 'ping' }]);
    vi.advanceTimersByTime(25_000);
    expect(latest().messages).toHaveLength(2);
  });
});

describe('reconnecting', () => {
  it('reconnects with backoff after an unexpected close', () => {
    const statuses: SocketStatus[] = [];
    const client = new ChatDashboardSocketClient({ onStatusChange: (s) => statuses.push(s) });
    client.connect(URL, options);
    latest().open();

    latest().drop();
    expect(statuses.at(-1)).toBe('disconnected');
    expect(FakeWebSocket.instances).toHaveLength(1);

    vi.advanceTimersByTime(999);
    expect(FakeWebSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(2);

    // second failure waits 1.5x as long
    latest().drop();
    vi.advanceTimersByTime(1499);
    expect(FakeWebSocket.instances).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(3);
  });

  it('caps the delay at 15 seconds', () => {
    const client = new ChatDashboardSocketClient();
    client.connect(URL, options);
    (client as unknown as { reconnectAttempts: number }).reconnectAttempts = 9;

    latest().drop();
    vi.advanceTimersByTime(14_999);
    expect(FakeWebSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it('resets the backoff after a successful open', () => {
    const client = new ChatDashboardSocketClient();
    client.connect(URL, options);
    latest().drop();
    vi.advanceTimersByTime(1000);
    latest().open();
    latest().drop();

    vi.advanceTimersByTime(1000);
    expect(FakeWebSocket.instances).toHaveLength(3);
  });

  it('gives up after the maximum number of attempts', () => {
    const client = new ChatDashboardSocketClient();
    client.connect(URL, options);

    for (let i = 0; i < 10; i++) {
      latest().drop();
      vi.advanceTimersByTime(15_000);
    }
    const count = FakeWebSocket.instances.length;
    expect(count).toBe(11);

    latest().drop();
    vi.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances).toHaveLength(count);
  });

  it('does not reconnect after a manual disconnect', () => {
    const statuses: SocketStatus[] = [];
    const client = new ChatDashboardSocketClient({ onStatusChange: (s) => statuses.push(s) });
    client.connect(URL, options);
    const socket = latest();
    socket.open();

    client.disconnect();
    expect(socket.close).toHaveBeenCalled();
    expect(statuses.at(-1)).toBe('disconnected');
    expect(client.isConnected).toBe(false);

    socket.onclose?.();
    vi.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('cancels a pending reconnect on disconnect', () => {
    const client = new ChatDashboardSocketClient();
    client.connect(URL, options);
    latest().drop();

    client.disconnect();
    vi.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('disconnect is safe before connecting', () => {
    expect(() => new ChatDashboardSocketClient().disconnect()).not.toThrow();
  });
});

describe('module singleton', () => {
  it('exports a shared client instance', () => {
    expect(chatDashboardSocket).toBeInstanceOf(ChatDashboardSocketClient);
  });
});
