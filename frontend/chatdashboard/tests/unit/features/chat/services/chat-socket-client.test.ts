import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type Handler = (ctx?: any) => void;

class Emitter {
  handlers: Record<string, Handler[]> = {};
  on(event: string, fn: Handler) {
    (this.handlers[event] ||= []).push(fn);
    return this;
  }
  removeAllListeners = vi.fn(() => {
    this.handlers = {};
  });
  emit(event: string, ctx?: any) {
    (this.handlers[event] || []).forEach((fn) => fn(ctx));
  }
}

class FakeSubscription extends Emitter {
  state = 'unsubscribed';
  subscribe = vi.fn();
  unsubscribe = vi.fn();
  publish = vi.fn((_data: unknown) => Promise.resolve({}));
  constructor(public channel: string) {
    super();
  }
  subscribed() {
    this.state = 'subscribed';
    this.emit('subscribed');
  }
  receive(data: unknown) {
    this.emit('publication', { data });
  }
}

class FakeCentrifuge extends Emitter {
  static instances: FakeCentrifuge[] = [];
  sub!: FakeSubscription;
  connect = vi.fn();
  disconnect = vi.fn();
  constructor(
    public url: string,
    public opts: unknown
  ) {
    super();
    FakeCentrifuge.instances.push(this);
  }
  newSubscription(channel: string) {
    this.sub = new FakeSubscription(channel);
    return this.sub;
  }
}

vi.mock('centrifuge', () => ({
  Centrifuge: class {
    constructor(url: string, opts: unknown) {
      return new FakeCentrifuge(url, opts);
    }
  },
  SubscriptionState: {
    Unsubscribed: 'unsubscribed',
    Subscribing: 'subscribing',
    Subscribed: 'subscribed'
  }
}));

import {
  ChatDashboardSocketClient,
  chatDashboardSocket,
  type JoinRoomOptions,
  type SocketStatus
} from '@/features/chat/services/chat-socket-client';
import type { Message } from '@/features/chat/utils/types';

const options: JoinRoomOptions = {
  tenantId: 't1',
  conversationId: 'c1',
  role: 'agent',
  senderName: 'Sam'
};
const message = { id: 'm1', text: 'hi' } as unknown as Message;
const URL = 'ws://chat.test/connection/websocket';

const latest = () => FakeCentrifuge.instances.at(-1)!;

function connected(callbacks = {}) {
  const client = new ChatDashboardSocketClient(callbacks);
  client.connect(URL, options);
  latest().sub.subscribed();
  return client;
}

beforeEach(() => {
  FakeCentrifuge.instances = [];
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('connect', () => {
  it('connects, subscribes to the tenant channel, and reports status', () => {
    const statuses: SocketStatus[] = [];
    const client = new ChatDashboardSocketClient({ onStatusChange: (s) => statuses.push(s) });

    client.connect(URL, options);
    const c = latest();
    expect(c.url).toBe(URL);
    expect(c.sub.channel).toBe('chat:t1');
    expect(c.sub.subscribe).toHaveBeenCalled();
    expect(c.connect).toHaveBeenCalled();
    expect(statuses).toEqual(['connecting']);
    expect(client.isConnected).toBe(false);

    c.sub.subscribed();
    expect(statuses).toEqual(['connecting', 'connected']);
    expect(client.isConnected).toBe(true);
  });

  it('does nothing without a url', () => {
    const client = new ChatDashboardSocketClient();
    client.connect('', options);
    expect(FakeCentrifuge.instances).toHaveLength(0);
  });

  it('tracks connecting and disconnected transport events', () => {
    const statuses: SocketStatus[] = [];
    const client = new ChatDashboardSocketClient({ onStatusChange: (s) => statuses.push(s) });
    client.connect(URL, options);
    latest().sub.subscribed();

    latest().emit('disconnected');
    expect(statuses.at(-1)).toBe('disconnected');
    latest().emit('connecting');
    expect(statuses.at(-1)).toBe('connecting');
  });

  it('marks the status as error when the client errors', () => {
    const statuses: SocketStatus[] = [];
    const client = new ChatDashboardSocketClient({ onStatusChange: (s) => statuses.push(s) });
    client.connect(URL, options);
    latest().emit('error', { error: new Error('boom') });
    expect(statuses.at(-1)).toBe('error');
  });

  it('tears down the previous connection when connecting again', () => {
    const client = new ChatDashboardSocketClient();
    client.connect(URL, options);
    const first = latest();
    client.connect(URL, options);
    expect(first.disconnect).toHaveBeenCalled();
    expect(first.sub.unsubscribe).toHaveBeenCalled();
    expect(FakeCentrifuge.instances).toHaveLength(2);
  });
});

describe('sending', () => {
  it('publishes chat messages with the joined tenant and sender', () => {
    const client = connected();
    client.sendMessage(message, 'c9');
    expect(latest().sub.publish).toHaveBeenCalledWith({
      type: 'chat_message',
      tenantId: 't1',
      role: 'agent',
      conversationId: 'c9',
      senderName: 'Sam',
      message
    });
  });

  it('defaults to the joined conversation', () => {
    const client = connected();
    client.sendMessage(message);
    expect(latest().sub.publish.mock.calls[0][0]).toMatchObject({ conversationId: 'c1' });
  });

  it('publishes typing status', () => {
    const client = connected();
    client.sendTyping(true);
    expect(latest().sub.publish).toHaveBeenCalledWith({
      type: 'typing_status',
      tenantId: 't1',
      role: 'agent',
      conversationId: 'c1',
      isTyping: true,
      senderName: 'Sam'
    });
  });

  it('does nothing before connecting', () => {
    const client = new ChatDashboardSocketClient();
    expect(() => {
      client.sendMessage(message);
      client.sendTyping(false);
    }).not.toThrow();
    expect(FakeCentrifuge.instances).toHaveLength(0);
  });

  it('uses demo defaults when connected without options', () => {
    const client = connected();
    (client as unknown as { options: null }).options = null;

    client.sendMessage(message);
    client.sendTyping(true);

    const calls = latest().sub.publish.mock.calls;
    expect(calls).toHaveLength(2);
    for (const [payload] of calls) {
      expect(payload).toMatchObject({
        tenantId: 'demo-tenant',
        conversationId: 'general',
        senderName: 'Support Agent'
      });
    }
  });

  it('drops messages until the subscription is active', () => {
    const client = new ChatDashboardSocketClient();
    client.connect(URL, options);
    client.sendMessage(message);
    expect(latest().sub.publish).not.toHaveBeenCalled();
  });

  it('logs a warning when publishing fails', async () => {
    const client = connected();
    latest().sub.publish.mockReturnValueOnce(Promise.reject(new Error('nope')));
    client.sendMessage(message);
    await Promise.resolve();
    await Promise.resolve();
    expect(console.warn).toHaveBeenCalled();
  });

  it('joinRoom only records the options used for later publishes', () => {
    const client = connected();
    client.joinRoom({ ...options, conversationId: 'c2' });
    expect(latest().sub.publish).not.toHaveBeenCalled();
    client.sendMessage(message);
    expect(latest().sub.publish.mock.calls[0][0]).toMatchObject({ conversationId: 'c2' });
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
    const client = connected(cb);
    return { cb, client };
  }

  it('dispatches chat messages', () => {
    const { cb } = setup();
    latest().sub.receive({
      type: 'chat_message',
      message,
      conversationId: 'c1',
      senderName: 'Vic'
    });
    expect(cb.onMessage).toHaveBeenCalledWith({
      message,
      conversationId: 'c1',
      senderName: 'Vic'
    });
  });

  it('ignores agent traffic including its own echo', () => {
    const { cb } = setup();
    latest().sub.receive({ type: 'chat_message', role: 'agent', message, conversationId: 'c1' });
    latest().sub.receive({ type: 'typing_status', role: 'agent', isTyping: true });
    expect(cb.onMessage).not.toHaveBeenCalled();
    expect(cb.onTyping).not.toHaveBeenCalled();
  });

  it('ignores chat messages without a body', () => {
    const { cb } = setup();
    latest().sub.receive({ type: 'chat_message', conversationId: 'c1' });
    expect(cb.onMessage).not.toHaveBeenCalled();
  });

  it('dispatches name updates only when complete', () => {
    const { cb } = setup();
    latest().sub.receive({ type: 'update_name', conversationId: 'c1', senderName: 'Vic' });
    latest().sub.receive({ type: 'update_name', conversationId: 'c1' });
    expect(cb.onUpdateName).toHaveBeenCalledTimes(1);
    expect(cb.onUpdateName).toHaveBeenCalledWith({ conversationId: 'c1', senderName: 'Vic' });
  });

  it('dispatches typing status with a Visitor fallback', () => {
    const { cb } = setup();
    latest().sub.receive({ type: 'typing_status', isTyping: 1, conversationId: 'c1' });
    expect(cb.onTyping).toHaveBeenCalledWith({
      isTyping: true,
      senderName: 'Visitor',
      conversationId: 'c1'
    });
  });

  it('dispatches presence', () => {
    const { cb } = setup();
    latest().sub.receive({
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

  it('ignores empty payloads and unknown events', () => {
    const { cb } = setup();
    latest().sub.receive(null);
    latest().sub.receive({ type: 'mystery' });
    expect(cb.onMessage).not.toHaveBeenCalled();
    expect(cb.onTyping).not.toHaveBeenCalled();
  });

  it('setCallbacks merges with existing callbacks', () => {
    const { cb, client } = setup();
    const onTyping = vi.fn();
    client.setCallbacks({ onTyping });

    latest().sub.receive({ type: 'typing_status', isTyping: true });
    latest().sub.receive({ type: 'chat_message', message });

    expect(onTyping).toHaveBeenCalled();
    expect(cb.onTyping).not.toHaveBeenCalled();
    expect(cb.onMessage).toHaveBeenCalled();
  });
});

describe('disconnect', () => {
  it('tears down the client and reports disconnected', () => {
    const statuses: SocketStatus[] = [];
    const client = connected({ onStatusChange: (s: SocketStatus) => statuses.push(s) });
    const c = latest();

    client.disconnect();
    expect(c.sub.unsubscribe).toHaveBeenCalled();
    expect(c.disconnect).toHaveBeenCalled();
    expect(statuses.at(-1)).toBe('disconnected');
    expect(client.isConnected).toBe(false);
  });

  it('is safe before connecting', () => {
    expect(() => new ChatDashboardSocketClient().disconnect()).not.toThrow();
  });
});

describe('module singleton', () => {
  it('exports a shared client instance', () => {
    expect(chatDashboardSocket).toBeInstanceOf(ChatDashboardSocketClient);
  });
});
