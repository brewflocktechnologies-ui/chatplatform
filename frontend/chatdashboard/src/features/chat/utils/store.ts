import { create } from 'zustand';
import type { Attachment, Conversation, Message } from './types';
import { initialConversations } from './data';
import { chatDashboardSocket, SocketStatus } from '../services/chat-socket-client';

type ReplyCursorState = Record<string, number>;
type TypingState = Record<string, boolean>;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (name[0] || 'V').toUpperCase();
}

type ChatState = {
  conversations: Conversation[];
  selectedConversationId: string;
  draft: string;
  replyCursor: ReplyCursorState;
  typingMap: TypingState;
  socketStatus: SocketStatus;
  isSocketInitialized: boolean;

  initSocket: (url?: string, tenantId?: string) => void;
  selectConversation: (id: string) => void;
  setDraft: (text: string) => void;
  sendMessage: (text: string, attachments?: Attachment[]) => void;
  sendTypingStatus: (isTyping: boolean) => void;
  addIncomingMessage: (conversationId: string, message: Message, senderName?: string) => void;
  updateConversationName: (conversationId: string, name: string) => void;
  setTyping: (conversationId: string, isTyping: boolean) => void;
  advanceReplyCursor: (conversationId: string) => void;
  getActiveConversation: () => Conversation | undefined;
};

export const useChatStore = create<ChatState>()((set, get) => ({
  conversations: initialConversations,
  selectedConversationId: initialConversations[0]?.id ?? '',
  draft: '',
  replyCursor: {},
  typingMap: {},
  socketStatus: 'disconnected',
  isSocketInitialized: false,

  initSocket: (url = 'ws://localhost:8088', tenantId = 'demo-tenant') => {
    if (get().isSocketInitialized) return;
    set({ isSocketInitialized: true });

    chatDashboardSocket.setCallbacks({
      onMessage: ({ message, conversationId, senderName }) => {
        const state = get();
        const authorName = (senderName || message.author || 'Visitor').trim();
        const targetConvoId = conversationId || state.selectedConversationId;

        const dashboardMsg: Message = {
          ...message,
          sender: 'contact',
          author: authorName
        };

        state.addIncomingMessage(targetConvoId, dashboardMsg, authorName);
      },

      onUpdateName: ({ senderName }) => {
        if (!senderName || !senderName.trim()) return;
        const newName = senderName.trim();
        const state = get();

        // If a conversation for this user name already exists, do not duplicate or rename
        const existing = state.conversations.find(
          (c) => c.name.toLowerCase() === newName.toLowerCase()
        );
        if (existing) {
          return;
        }

        // Distinct user name! Treat as a brand-new separate user conversation
        // NEVER replace or overwrite any existing user's conversation
        const newId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const newConvo: Conversation = {
          id: newId,
          name: newName,
          title: 'Live Visitor Chat',
          status: 'online',
          unread: 0,
          initials: getInitials(newName),
          messages: [],
          quickReplies: [
            'How can I help you today?',
            'Let me check that for you.',
            'Is there anything else I can assist with?'
          ],
          autoReplies: [
            'Thanks for reaching out! Let me check on that.',
            'Sounds great, thank you!'
          ]
        };

        set({
          conversations: [newConvo, ...state.conversations],
          selectedConversationId: state.selectedConversationId || newId
        });
      },

      onTyping: ({ isTyping, conversationId, senderName }) => {
        const state = get();
        // Resolve conversation by name or id
        let targetId = conversationId;
        if (senderName) {
          const matched = state.conversations.find((c) => c.name.toLowerCase() === senderName.toLowerCase());
          if (matched) targetId = matched.id;
        }
        if (!targetId) targetId = state.selectedConversationId;
        if (targetId) {
          get().setTyping(targetId, isTyping);
        }
      },

      onPresence: ({ status, role, senderName, conversationId }) => {
        if (role === 'visitor') {
          const authorName = (senderName || 'Live Visitor').trim();
          const state = get();

          // Check if this exact user already exists by name
          const existing = state.conversations.find(
            (c) => c.name.toLowerCase() === authorName.toLowerCase()
          );

          if (existing) {
            // Update status without renaming or altering user identity
            set({
              conversations: state.conversations.map((c) =>
                c.id === existing.id
                  ? { ...c, status: status === 'online' ? 'online' : 'offline' }
                  : c
              )
            });
          } else if (status === 'online') {
            // New separate user section!
            const newId = conversationId && !state.conversations.some((c) => c.id === conversationId)
              ? conversationId
              : `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

            const newConvo: Conversation = {
              id: newId,
              name: authorName,
              title: 'Live Visitor Chat',
              status: 'online',
              unread: 0,
              initials: getInitials(authorName),
              messages: [],
              quickReplies: [
                'How can I help you today?',
                'Let me check that for you.',
                'Is there anything else I can assist with?'
              ],
              autoReplies: [
                'Thanks for the message! Let me check on my end.',
                'Sounds great, thank you!'
              ]
            };

            set({
              conversations: [newConvo, ...state.conversations],
              selectedConversationId: state.selectedConversationId || newId
            });
          }
        }
      },

      onStatusChange: (status) => {
        set({ socketStatus: status });
      }
    });

    const activeConvo = get().getActiveConversation();
    chatDashboardSocket.connect(url, {
      tenantId,
      conversationId: activeConvo?.id || 'general',
      role: 'agent',
      senderName: 'Support Agent'
    });
  },

  selectConversation: (id) => {
    set((state) => ({
      selectedConversationId: id,
      conversations: state.conversations.map((c) => (c.id === id ? { ...c, unread: 0 } : c))
    }));

    if (chatDashboardSocket.isConnected) {
      chatDashboardSocket.joinRoom({
        tenantId: 'demo-tenant',
        conversationId: id,
        role: 'agent',
        senderName: 'Support Agent'
      });
    }
  },

  setDraft: (text) => set({ draft: text }),

  sendMessage: (text, attachments) => {
    const state = get();
    const activeConvoId = state.selectedConversationId;
    const existing = state.conversations.find((c) => c.id === activeConvoId);
    if (!existing) return;

    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const outgoing: Message = {
      id: 'outgoing-' + Date.now().toString(),
      sender: 'user',
      author: 'You',
      text: text.trim(),
      timestamp,
      attachments: attachments?.length ? attachments : undefined
    };

    // Move updated conversation to top like WhatsApp
    const updatedConvo: Conversation = {
      ...existing,
      messages: [...existing.messages, outgoing],
      unread: 0
    };
    const otherConversations = state.conversations.filter((c) => c.id !== activeConvoId);

    set({
      draft: '',
      conversations: [updatedConvo, ...otherConversations]
    });

    if (chatDashboardSocket.isConnected) {
      chatDashboardSocket.sendMessage(outgoing, activeConvoId);
      chatDashboardSocket.sendTyping(false, activeConvoId);
    }
  },

  sendTypingStatus: (isTyping: boolean) => {
    const activeId = get().selectedConversationId;
    if (chatDashboardSocket.isConnected && activeId) {
      chatDashboardSocket.sendTyping(isTyping, activeId);
    }
  },

  addIncomingMessage: (conversationId, message, senderName) =>
    set((state) => {
      const authorName = (senderName || message.author || 'Visitor').trim();

      // Look up target by user name (each user name is a separate user)
      let target = state.conversations.find(
        (c) => c.name.toLowerCase() === authorName.toLowerCase()
      );

      // If not found by name, check if matching conversationId has this same user name
      if (!target && conversationId) {
        const byId = state.conversations.find((c) => c.id === conversationId);
        if (byId && byId.name.toLowerCase() === authorName.toLowerCase()) {
          target = byId;
        }
      }

      // If target does not exist (new user name!), create a NEW separate user conversation
      // NEVER overwrite or rename any existing user!
      if (!target) {
        const newId = conversationId && !state.conversations.some((c) => c.id === conversationId)
          ? conversationId
          : `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

        const newConvo: Conversation = {
          id: newId,
          name: authorName,
          title: 'Live Visitor Chat',
          status: 'online',
          unread: state.selectedConversationId === newId ? 0 : 1,
          initials: getInitials(authorName),
          messages: [message],
          quickReplies: [
            'How can I help you today?',
            'Let me check that for you.',
            'Is there anything else I can assist with?'
          ],
          autoReplies: [
            'Thanks for getting back to me!',
            'Got it, thank you!'
          ]
        };

        return {
          conversations: [newConvo, ...state.conversations],
          selectedConversationId: state.selectedConversationId || newId
        };
      }

      // Existing user: check message deduplication
      if (target.messages.some((m) => m.id === message.id)) {
        return state;
      }

      const isActive = state.selectedConversationId === target.id;
      const updatedConvo: Conversation = {
        ...target,
        status: 'online',
        messages: [...target.messages, message],
        unread: isActive ? 0 : target.unread + 1
      };

      // Move active user conversation to top like WhatsApp
      const otherConversations = state.conversations.filter((c) => c.id !== target.id);
      return {
        conversations: [updatedConvo, ...otherConversations]
      };
    }),

  updateConversationName: (conversationId, name) =>
    set((state) => {
      // If name matches an existing conversation, do not rename
      const trimmed = name.trim();
      if (!trimmed) return state;

      // Treat as separate user section if name doesn't match
      const existing = state.conversations.find((c) => c.id === conversationId);
      if (existing && existing.name.toLowerCase() === trimmed.toLowerCase()) {
        return state;
      }

      // Create new user conversation for this name rather than wiping the previous user
      const newId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newConvo: Conversation = {
        id: newId,
        name: trimmed,
        title: 'Live Visitor Chat',
        status: 'online',
        unread: 0,
        initials: getInitials(trimmed),
        messages: [],
        quickReplies: [
          'How can I help you today?',
          'Let me check that for you.'
        ],
        autoReplies: []
      };

      return {
        conversations: [newConvo, ...state.conversations],
        selectedConversationId: state.selectedConversationId || newId
      };
    }),

  setTyping: (conversationId, isTyping) =>
    set((state) => ({
      typingMap: {
        ...state.typingMap,
        [conversationId]: isTyping
      }
    })),

  advanceReplyCursor: (conversationId) =>
    set((state) => ({
      replyCursor: {
        ...state.replyCursor,
        [conversationId]: (state.replyCursor[conversationId] ?? 0) + 1
      }
    })),

  getActiveConversation: () => {
    const state = get();
    return state.conversations.find((c) => c.id === state.selectedConversationId);
  }
}));
