import { describe, it, expect, vi } from 'vitest';

// Covers the store's initial-selection branch when seed data is present.
vi.mock('@/features/chat/services/chat-socket-client', () => ({
  chatDashboardSocket: {
    isConnected: false,
    setCallbacks: vi.fn(),
    connect: vi.fn(),
    joinRoom: vi.fn(),
    sendMessage: vi.fn(),
    sendTyping: vi.fn()
  }
}));

vi.mock('@/features/chat/utils/data', () => ({
  initialConversations: [
    {
      id: 'seed-1',
      name: 'Seed User',
      title: 'Live Visitor Chat',
      status: 'online',
      unread: 0,
      initials: 'SU',
      messages: [],
      quickReplies: [],
      autoReplies: []
    }
  ]
}));

import { useChatStore } from '@/features/chat/utils/store';

describe('chat store with seeded conversations', () => {
  it('selects the first seeded conversation by default', () => {
    const state = useChatStore.getState();
    expect(state.conversations).toHaveLength(1);
    expect(state.selectedConversationId).toBe('seed-1');
    expect(state.getActiveConversation()?.name).toBe('Seed User');
  });
});
