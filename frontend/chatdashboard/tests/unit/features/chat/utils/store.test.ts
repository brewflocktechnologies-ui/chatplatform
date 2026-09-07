import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Conversation, Message } from '@/features/chat/utils/types';
import type { SocketClientCallbacks } from '@/features/chat/services/chat-socket-client';

const socketMock = vi.hoisted(() => ({
  isConnected: false,
  setCallbacks: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  joinRoom: vi.fn(),
  sendMessage: vi.fn(),
  sendTyping: vi.fn()
}));

vi.mock('@/features/chat/services/chat-socket-client', () => ({
  chatDashboardSocket: socketMock
}));

import { useChatStore } from '@/features/chat/utils/store';

const initialState = useChatStore.getState();

function makeConvo(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'c1',
    name: 'John Doe',
    title: 'Live Visitor Chat',
    status: 'offline',
    unread: 0,
    initials: 'JD',
    messages: [],
    quickReplies: [],
    autoReplies: [],
    ...overrides
  };
}

function makeMsg(overrides: Partial<Message> = {}): Message {
  return {
    id: 'm1',
    sender: 'contact',
    author: 'John Doe',
    text: 'hello',
    timestamp: '10:00 AM',
    ...overrides
  };
}

function getCallbacks(): SocketClientCallbacks {
  useChatStore.getState().initSocket();
  const calls = socketMock.setCallbacks.mock.calls;
  return calls[calls.length - 1][0] as SocketClientCallbacks;
}

beforeEach(() => {
  vi.clearAllMocks();
  socketMock.isConnected = false;
  useChatStore.setState({ ...initialState }, true);
});

describe('initial state', () => {
  it('starts with no conversations and empty selection', () => {
    const state = useChatStore.getState();
    expect(state.conversations).toEqual([]);
    expect(state.selectedConversationId).toBe('');
    expect(state.draft).toBe('');
    expect(state.replyCursor).toEqual({});
    expect(state.typingMap).toEqual({});
    expect(state.socketStatus).toBe('disconnected');
    expect(state.isSocketInitialized).toBe(false);
  });
});

describe('initSocket', () => {
  it('registers callbacks and connects with default url and tenant', () => {
    useChatStore.getState().initSocket();
    expect(useChatStore.getState().isSocketInitialized).toBe(true);
    expect(socketMock.setCallbacks).toHaveBeenCalledTimes(1);
    expect(socketMock.connect).toHaveBeenCalledWith('ws://localhost:8088', {
      tenantId: 'demo-tenant',
      conversationId: 'general',
      role: 'agent',
      senderName: 'Support Agent'
    });
  });

  it('does nothing when already initialized', () => {
    useChatStore.getState().initSocket();
    useChatStore.getState().initSocket();
    expect(socketMock.setCallbacks).toHaveBeenCalledTimes(1);
    expect(socketMock.connect).toHaveBeenCalledTimes(1);
  });

  it('uses provided url and tenant and the active conversation id', () => {
    useChatStore.setState({
      conversations: [makeConvo({ id: 'active-1' })],
      selectedConversationId: 'active-1'
    });
    useChatStore.getState().initSocket('ws://example.test:9000', 'tenant-x');
    expect(socketMock.connect).toHaveBeenCalledWith('ws://example.test:9000', {
      tenantId: 'tenant-x',
      conversationId: 'active-1',
      role: 'agent',
      senderName: 'Support Agent'
    });
  });
});

describe('socket onMessage callback', () => {
  it('adds an incoming message using the provided sender name and conversation id', () => {
    const cbs = getCallbacks();
    cbs.onMessage!({
      message: makeMsg({ sender: 'user', author: 'ignored' }),
      conversationId: 'conv-9',
      senderName: 'Jane Roe'
    });
    const state = useChatStore.getState();
    expect(state.conversations).toHaveLength(1);
    const convo = state.conversations[0];
    expect(convo.id).toBe('conv-9');
    expect(convo.name).toBe('Jane Roe');
    expect(convo.messages[0].sender).toBe('contact');
    expect(convo.messages[0].author).toBe('Jane Roe');
  });

  it('falls back to the message author and selected conversation', () => {
    useChatStore.setState({
      conversations: [makeConvo({ id: 'c1', name: 'John Doe' })],
      selectedConversationId: 'c1'
    });
    const cbs = getCallbacks();
    cbs.onMessage!({
      message: makeMsg({ id: 'm2', author: 'John Doe' }),
      conversationId: ''
    });
    const state = useChatStore.getState();
    expect(state.conversations).toHaveLength(1);
    expect(state.conversations[0].messages).toHaveLength(1);
    expect(state.conversations[0].messages[0].author).toBe('John Doe');
  });

  it('falls back to Visitor when neither sender name nor author is present', () => {
    const cbs = getCallbacks();
    cbs.onMessage!({
      message: makeMsg({ author: '' }),
      conversationId: 'conv-1'
    });
    const state = useChatStore.getState();
    expect(state.conversations[0].name).toBe('Visitor');
    expect(state.conversations[0].initials).toBe('V');
  });
});

describe('socket onUpdateName callback', () => {
  it('ignores empty and whitespace-only names', () => {
    const cbs = getCallbacks();
    cbs.onUpdateName!({ conversationId: 'c1', senderName: '' });
    cbs.onUpdateName!({ conversationId: 'c1', senderName: '   ' });
    expect(useChatStore.getState().conversations).toHaveLength(0);
  });

  it('does not duplicate a conversation whose name already exists', () => {
    useChatStore.setState({ conversations: [makeConvo({ name: 'John Doe' })] });
    const cbs = getCallbacks();
    cbs.onUpdateName!({ conversationId: 'other', senderName: 'john doe' });
    expect(useChatStore.getState().conversations).toHaveLength(1);
  });

  it('creates a new conversation for a distinct name and selects it when nothing is selected', () => {
    const cbs = getCallbacks();
    cbs.onUpdateName!({ conversationId: 'c1', senderName: '  Jane Roe  ' });
    const state = useChatStore.getState();
    expect(state.conversations).toHaveLength(1);
    const convo = state.conversations[0];
    expect(convo.name).toBe('Jane Roe');
    expect(convo.initials).toBe('JR');
    expect(convo.title).toBe('Live Visitor Chat');
    expect(convo.status).toBe('online');
    expect(convo.messages).toEqual([]);
    expect(convo.quickReplies).toHaveLength(3);
    expect(convo.autoReplies).toHaveLength(2);
    expect(state.selectedConversationId).toBe(convo.id);
  });

  it('keeps the current selection when one already exists', () => {
    useChatStore.setState({
      conversations: [makeConvo({ id: 'c1', name: 'John Doe' })],
      selectedConversationId: 'c1'
    });
    const cbs = getCallbacks();
    cbs.onUpdateName!({ conversationId: 'x', senderName: 'Jane Roe' });
    const state = useChatStore.getState();
    expect(state.conversations).toHaveLength(2);
    expect(state.selectedConversationId).toBe('c1');
  });
});

describe('socket onTyping callback', () => {
  it('resolves the conversation by sender name', () => {
    useChatStore.setState({ conversations: [makeConvo({ id: 'c1', name: 'John Doe' })] });
    const cbs = getCallbacks();
    cbs.onTyping!({ isTyping: true, senderName: 'JOHN DOE', conversationId: 'wrong-id' });
    expect(useChatStore.getState().typingMap['c1']).toBe(true);
  });

  it('uses the conversation id when the name does not match', () => {
    useChatStore.setState({ conversations: [makeConvo({ id: 'c1', name: 'John Doe' })] });
    const cbs = getCallbacks();
    cbs.onTyping!({ isTyping: true, senderName: 'Nobody', conversationId: 'c9' });
    expect(useChatStore.getState().typingMap['c9']).toBe(true);
  });

  it('falls back to the selected conversation', () => {
    useChatStore.setState({ selectedConversationId: 'sel-1' });
    const cbs = getCallbacks();
    cbs.onTyping!({ isTyping: true, senderName: '' });
    expect(useChatStore.getState().typingMap['sel-1']).toBe(true);
  });

  it('does nothing when no conversation can be resolved', () => {
    const cbs = getCallbacks();
    cbs.onTyping!({ isTyping: true, senderName: '' });
    expect(useChatStore.getState().typingMap).toEqual({});
  });
});

describe('socket onPresence callback', () => {
  it('ignores non-visitor roles', () => {
    const cbs = getCallbacks();
    cbs.onPresence!({ status: 'online', role: 'agent', senderName: 'Someone' });
    expect(useChatStore.getState().conversations).toHaveLength(0);
  });

  it('marks an existing conversation online without renaming it', () => {
    useChatStore.setState({
      conversations: [makeConvo({ id: 'c1', name: 'John Doe', status: 'offline' })]
    });
    const cbs = getCallbacks();
    cbs.onPresence!({ status: 'online', role: 'visitor', senderName: 'john doe' });
    const state = useChatStore.getState();
    expect(state.conversations).toHaveLength(1);
    expect(state.conversations[0].status).toBe('online');
    expect(state.conversations[0].name).toBe('John Doe');
  });

  it('marks an existing conversation offline and leaves other conversations alone', () => {
    useChatStore.setState({
      conversations: [
        makeConvo({ id: 'c1', name: 'John Doe', status: 'online' }),
        makeConvo({ id: 'c2', name: 'Jane Roe', status: 'online', initials: 'JR' })
      ]
    });
    const cbs = getCallbacks();
    cbs.onPresence!({ status: 'offline', role: 'visitor', senderName: 'John Doe' });
    const state = useChatStore.getState();
    expect(state.conversations.find((c) => c.id === 'c1')?.status).toBe('offline');
    expect(state.conversations.find((c) => c.id === 'c2')?.status).toBe('online');
  });

  it('creates a new conversation for a new online visitor using the given id', () => {
    const cbs = getCallbacks();
    cbs.onPresence!({
      status: 'online',
      role: 'visitor',
      senderName: 'Jane Roe',
      conversationId: 'conv-77'
    });
    const state = useChatStore.getState();
    expect(state.conversations).toHaveLength(1);
    const convo = state.conversations[0];
    expect(convo.id).toBe('conv-77');
    expect(convo.name).toBe('Jane Roe');
    expect(convo.status).toBe('online');
    expect(state.selectedConversationId).toBe('conv-77');
  });

  it('generates a fresh id when the given conversation id is already in use', () => {
    useChatStore.setState({
      conversations: [makeConvo({ id: 'conv-77', name: 'John Doe' })],
      selectedConversationId: 'conv-77'
    });
    const cbs = getCallbacks();
    cbs.onPresence!({
      status: 'online',
      role: 'visitor',
      senderName: 'Jane Roe',
      conversationId: 'conv-77'
    });
    const state = useChatStore.getState();
    expect(state.conversations).toHaveLength(2);
    expect(state.conversations[0].id).toMatch(/^user-/);
    expect(state.selectedConversationId).toBe('conv-77');
  });

  it('generates an id and falls back to Live Visitor when no name or id is provided', () => {
    const cbs = getCallbacks();
    cbs.onPresence!({ status: 'online', role: 'visitor', senderName: '' });
    const state = useChatStore.getState();
    expect(state.conversations).toHaveLength(1);
    expect(state.conversations[0].id).toMatch(/^user-/);
    expect(state.conversations[0].name).toBe('Live Visitor');
    expect(state.conversations[0].initials).toBe('LV');
  });

  it('ignores offline presence for unknown visitors', () => {
    const cbs = getCallbacks();
    cbs.onPresence!({ status: 'offline', role: 'visitor', senderName: 'Ghost User' });
    expect(useChatStore.getState().conversations).toHaveLength(0);
  });
});

describe('socket onStatusChange callback', () => {
  it('updates the socket status', () => {
    const cbs = getCallbacks();
    cbs.onStatusChange!('connected');
    expect(useChatStore.getState().socketStatus).toBe('connected');
    cbs.onStatusChange!('error');
    expect(useChatStore.getState().socketStatus).toBe('error');
  });
});

describe('selectConversation', () => {
  it('selects the conversation and clears its unread count', () => {
    useChatStore.setState({
      conversations: [
        makeConvo({ id: 'c1', unread: 4 }),
        makeConvo({ id: 'c2', name: 'Jane Roe', unread: 2 })
      ]
    });
    useChatStore.getState().selectConversation('c1');
    const state = useChatStore.getState();
    expect(state.selectedConversationId).toBe('c1');
    expect(state.conversations.find((c) => c.id === 'c1')?.unread).toBe(0);
    expect(state.conversations.find((c) => c.id === 'c2')?.unread).toBe(2);
    expect(socketMock.joinRoom).not.toHaveBeenCalled();
  });

  it('joins the room when the socket is connected', () => {
    socketMock.isConnected = true;
    useChatStore.setState({ conversations: [makeConvo({ id: 'c1' })] });
    useChatStore.getState().selectConversation('c1');
    expect(socketMock.joinRoom).toHaveBeenCalledWith({
      tenantId: 'demo-tenant',
      conversationId: 'c1',
      role: 'agent',
      senderName: 'Support Agent'
    });
  });
});

describe('setDraft', () => {
  it('stores the draft text', () => {
    useChatStore.getState().setDraft('hello there');
    expect(useChatStore.getState().draft).toBe('hello there');
  });
});

describe('sendMessage', () => {
  it('does nothing when no conversation is selected', () => {
    const before = useChatStore.getState().conversations;
    useChatStore.getState().sendMessage('hello');
    expect(useChatStore.getState().conversations).toBe(before);
    expect(socketMock.sendMessage).not.toHaveBeenCalled();
  });

  it('appends the trimmed message, clears the draft and moves the conversation to the top', () => {
    useChatStore.setState({
      conversations: [
        makeConvo({ id: 'c2', name: 'Jane Roe' }),
        makeConvo({ id: 'c1', unread: 3 })
      ],
      selectedConversationId: 'c1',
      draft: '  hi  '
    });
    useChatStore.getState().sendMessage('  hi  ');
    const state = useChatStore.getState();
    expect(state.draft).toBe('');
    expect(state.conversations[0].id).toBe('c1');
    expect(state.conversations[0].unread).toBe(0);
    expect(state.conversations[1].id).toBe('c2');
    const msg = state.conversations[0].messages[0];
    expect(msg.sender).toBe('user');
    expect(msg.author).toBe('You');
    expect(msg.text).toBe('hi');
    expect(msg.id).toMatch(/^outgoing-/);
    expect(msg.attachments).toBeUndefined();
    expect(socketMock.sendMessage).not.toHaveBeenCalled();
    expect(socketMock.sendTyping).not.toHaveBeenCalled();
  });

  it('treats an empty attachments array as no attachments', () => {
    useChatStore.setState({
      conversations: [makeConvo({ id: 'c1' })],
      selectedConversationId: 'c1'
    });
    useChatStore.getState().sendMessage('hi', []);
    expect(useChatStore.getState().conversations[0].messages[0].attachments).toBeUndefined();
  });

  it('includes attachments and notifies the socket when connected', () => {
    socketMock.isConnected = true;
    const attachments = [{ id: 'a1', name: 'file.png', size: 10, type: 'image/png' }];
    useChatStore.setState({
      conversations: [makeConvo({ id: 'c1' })],
      selectedConversationId: 'c1'
    });
    useChatStore.getState().sendMessage('with file', attachments);
    const msg = useChatStore.getState().conversations[0].messages[0];
    expect(msg.attachments).toEqual(attachments);
    expect(socketMock.sendMessage).toHaveBeenCalledWith(msg, 'c1');
    expect(socketMock.sendTyping).toHaveBeenCalledWith(false, 'c1');
  });
});

describe('sendTypingStatus', () => {
  it('sends the typing status when connected and a conversation is selected', () => {
    socketMock.isConnected = true;
    useChatStore.setState({ selectedConversationId: 'c1' });
    useChatStore.getState().sendTypingStatus(true);
    expect(socketMock.sendTyping).toHaveBeenCalledWith(true, 'c1');
  });

  it('does nothing when disconnected', () => {
    useChatStore.setState({ selectedConversationId: 'c1' });
    useChatStore.getState().sendTypingStatus(true);
    expect(socketMock.sendTyping).not.toHaveBeenCalled();
  });

  it('does nothing when no conversation is selected', () => {
    socketMock.isConnected = true;
    useChatStore.getState().sendTypingStatus(false);
    expect(socketMock.sendTyping).not.toHaveBeenCalled();
  });
});

describe('addIncomingMessage', () => {
  it('creates a new conversation with a generated id and one unread message', () => {
    useChatStore.getState().addIncomingMessage('', makeMsg(), 'New Person');
    const state = useChatStore.getState();
    expect(state.conversations).toHaveLength(1);
    const convo = state.conversations[0];
    expect(convo.id).toMatch(/^user-/);
    expect(convo.name).toBe('New Person');
    expect(convo.initials).toBe('NP');
    expect(convo.unread).toBe(1);
    expect(convo.messages).toHaveLength(1);
    expect(state.selectedConversationId).toBe(convo.id);
  });

  it('reuses the given conversation id and starts read when that id is already selected', () => {
    useChatStore.getState().selectConversation('ghost');
    useChatStore.getState().addIncomingMessage('ghost', makeMsg(), 'New Person');
    const state = useChatStore.getState();
    const convo = state.conversations[0];
    expect(convo.id).toBe('ghost');
    expect(convo.unread).toBe(0);
    expect(state.selectedConversationId).toBe('ghost');
  });

  it('generates a fresh id when the given conversation id belongs to another user', () => {
    useChatStore.setState({
      conversations: [makeConvo({ id: 'c1', name: 'John Doe' })],
      selectedConversationId: 'c1'
    });
    useChatStore.getState().addIncomingMessage('c1', makeMsg({ author: 'Jane Roe' }));
    const state = useChatStore.getState();
    expect(state.conversations).toHaveLength(2);
    expect(state.conversations[0].id).toMatch(/^user-/);
    expect(state.conversations[0].name).toBe('Jane Roe');
  });

  it('appends to an existing conversation matched by name and marks it online', () => {
    useChatStore.setState({
      conversations: [
        makeConvo({ id: 'c2', name: 'Jane Roe' }),
        makeConvo({ id: 'c1', name: 'John Doe', status: 'offline', messages: [makeMsg()] })
      ],
      selectedConversationId: 'c1'
    });
    useChatStore.getState().addIncomingMessage('c1', makeMsg({ id: 'm2' }), 'john doe');
    const state = useChatStore.getState();
    expect(state.conversations[0].id).toBe('c1');
    expect(state.conversations[0].status).toBe('online');
    expect(state.conversations[0].messages).toHaveLength(2);
    expect(state.conversations[0].unread).toBe(0);
    expect(state.conversations[1].id).toBe('c2');
  });

  it('increments unread when the conversation is not active', () => {
    useChatStore.setState({
      conversations: [makeConvo({ id: 'c1', name: 'John Doe', unread: 1 })],
      selectedConversationId: 'other'
    });
    useChatStore.getState().addIncomingMessage('c1', makeMsg(), 'John Doe');
    expect(useChatStore.getState().conversations[0].unread).toBe(2);
  });

  it('deduplicates messages by id', () => {
    const msg = makeMsg({ id: 'dup-1' });
    useChatStore.setState({
      conversations: [makeConvo({ id: 'c1', name: 'John Doe', messages: [msg] })]
    });
    const before = useChatStore.getState().conversations;
    useChatStore.getState().addIncomingMessage('c1', makeMsg({ id: 'dup-1' }), 'John Doe');
    expect(useChatStore.getState().conversations).toBe(before);
  });

  it('handles a whitespace-only sender name with the fallback initial', () => {
    useChatStore.getState().addIncomingMessage('', makeMsg({ author: 'ignored' }), '   ');
    const convo = useChatStore.getState().conversations[0];
    expect(convo.name).toBe('');
    expect(convo.initials).toBe('V');
  });
});

describe('updateConversationName', () => {
  it('ignores empty names', () => {
    useChatStore.setState({ conversations: [makeConvo({ id: 'c1' })] });
    const before = useChatStore.getState().conversations;
    useChatStore.getState().updateConversationName('c1', '   ');
    expect(useChatStore.getState().conversations).toBe(before);
  });

  it('does not rename when the conversation already has that name', () => {
    useChatStore.setState({ conversations: [makeConvo({ id: 'c1', name: 'John Doe' })] });
    const before = useChatStore.getState().conversations;
    useChatStore.getState().updateConversationName('c1', ' JOHN DOE ');
    expect(useChatStore.getState().conversations).toBe(before);
  });

  it('creates a separate conversation for a new name and selects it when nothing is selected', () => {
    useChatStore.setState({ conversations: [makeConvo({ id: 'c1', name: 'John Doe' })] });
    useChatStore.getState().updateConversationName('c1', 'Jane Roe');
    const state = useChatStore.getState();
    expect(state.conversations).toHaveLength(2);
    const convo = state.conversations[0];
    expect(convo.id).toMatch(/^user-/);
    expect(convo.name).toBe('Jane Roe');
    expect(convo.status).toBe('online');
    expect(convo.quickReplies).toHaveLength(2);
    expect(convo.autoReplies).toEqual([]);
    expect(state.conversations[1].name).toBe('John Doe');
    expect(state.selectedConversationId).toBe(convo.id);
  });

  it('creates a conversation even when the target id does not exist and keeps the selection', () => {
    useChatStore.setState({ selectedConversationId: 'kept' });
    useChatStore.getState().updateConversationName('missing', 'Solo');
    const state = useChatStore.getState();
    expect(state.conversations).toHaveLength(1);
    expect(state.conversations[0].name).toBe('Solo');
    expect(state.conversations[0].initials).toBe('S');
    expect(state.selectedConversationId).toBe('kept');
  });
});

describe('setTyping', () => {
  it('records the typing state per conversation', () => {
    useChatStore.getState().setTyping('c1', true);
    useChatStore.getState().setTyping('c2', false);
    expect(useChatStore.getState().typingMap).toEqual({ c1: true, c2: false });
  });
});

describe('advanceReplyCursor', () => {
  it('starts at one and increments on repeated calls', () => {
    useChatStore.getState().advanceReplyCursor('c1');
    expect(useChatStore.getState().replyCursor['c1']).toBe(1);
    useChatStore.getState().advanceReplyCursor('c1');
    expect(useChatStore.getState().replyCursor['c1']).toBe(2);
  });
});

describe('getActiveConversation', () => {
  it('returns undefined when nothing matches', () => {
    expect(useChatStore.getState().getActiveConversation()).toBeUndefined();
  });

  it('returns the selected conversation', () => {
    const convo = makeConvo({ id: 'c1' });
    useChatStore.setState({ conversations: [convo], selectedConversationId: 'c1' });
    expect(useChatStore.getState().getActiveConversation()).toEqual(convo);
  });
});
