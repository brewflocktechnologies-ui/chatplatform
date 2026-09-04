'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { useChatStore } from '../utils/store';
import type { Attachment, Message } from '../utils/types';
import { ConversationList } from './conversation-list';
import { ConversationSelect } from './conversation-select';
import { ChatArea } from './chat-area';
import { chatDashboardSocket } from '../services/chat-socket-client';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

export function Messenger() {
  const {
    conversations,
    selectedConversationId,
    draft,
    replyCursor,
    initSocket,
    selectConversation,
    setDraft,
    sendMessage,
    sendTypingStatus,
    addIncomingMessage,
    advanceReplyCursor,
    getActiveConversation
  } = useChatStore();

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const shouldReduceMotion = useReducedMotion();
  const replyTimeoutRef = useRef<number | null>(null);
  const selectedRef = useRef(selectedConversationId);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize socket on mount
  useEffect(() => {
    const wsUrl =
      process.env.NEXT_PUBLIC_CHAT_WS_URL || 'ws://localhost:8088';
    initSocket(wsUrl, 'demo-tenant');
  }, [initSocket]);

  useEffect(() => {
    selectedRef.current = selectedConversationId;
    setAttachments([]);
  }, [selectedConversationId]);

  useEffect(() => {
    return () => {
      if (replyTimeoutRef.current) {
        window.clearTimeout(replyTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleDraftChange = useCallback(
    (text: string) => {
      setDraft(text);

      if (chatDashboardSocket.isConnected) {
        sendTypingStatus(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          sendTypingStatus(false);
        }, 1500);
      }
    },
    [setDraft, sendTypingStatus]
  );

  const handleAddAttachments = useCallback((files: FileList) => {
    const newAttachments: Attachment[] = Array.from(files).map((file) => ({
      id: 'file-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      name: file.name,
      size: file.size,
      type: file.type
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
  }, []);

  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const active = getActiveConversation();
      if ((!draft.trim() && attachments.length === 0) || !active) return;

      const conversationId = active.id;
      sendMessage(draft, attachments.length > 0 ? attachments : undefined);
      setAttachments([]);

      // If socket is connected, the real recipient receives the message over WebSocket.
      // If socket is offline/disconnected, run the simulated auto-replies for demo mode.
      if (!chatDashboardSocket.isConnected) {
        const autoReplies = active.autoReplies;
        if (!autoReplies.length) return;

        const cursor = replyCursor[conversationId] ?? 0;
        const nextReply = autoReplies[cursor % autoReplies.length];
        const delay = shouldReduceMotion ? 0 : 900;

        replyTimeoutRef.current = window.setTimeout(() => {
          const timestamp = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          });
          const incoming: Message = {
            id: 'incoming-' + Date.now().toString(),
            sender: 'contact',
            author: active.name,
            text: nextReply,
            timestamp
          };

          addIncomingMessage(conversationId, incoming);
          advanceReplyCursor(conversationId);
        }, delay);
      }
    },
    [
      draft,
      attachments,
      replyCursor,
      shouldReduceMotion,
      getActiveConversation,
      sendMessage,
      addIncomingMessage,
      advanceReplyCursor
    ]
  );

  const activeConversation = getActiveConversation();
  const socketStatus = useChatStore((state) => state.socketStatus);

  return (
    <div className='border-border/50 bg-background/70 relative grid h-[calc(100dvh-5.5rem)] w-full grid-rows-[auto,1fr] gap-3 overflow-hidden rounded-2xl border p-3 backdrop-blur-xl sm:gap-4 sm:p-4 lg:[grid-template-columns:340px_1fr] lg:grid-rows-[1fr] lg:gap-4 lg:rounded-3xl lg:p-5'>
      <ConversationSelect
        conversations={conversations}
        selectedId={selectedConversationId}
        onSelect={selectConversation}
      />
      <ConversationList
        conversations={conversations}
        selectedId={selectedConversationId}
        onSelect={selectConversation}
      />
      {activeConversation ? (
        <ChatArea
          conversation={activeConversation}
          draft={draft}
          onDraftChange={handleDraftChange}
          onSubmit={handleSubmit}
          attachments={attachments}
          onAddAttachments={handleAddAttachments}
          onRemoveAttachment={handleRemoveAttachment}
        />
      ) : (
        <div className='border-border/50 bg-background/80 flex min-h-0 flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border p-6 text-center backdrop-blur-xl sm:p-10 lg:col-start-2 lg:col-end-3 lg:rounded-3xl'>
          <div className='bg-primary/10 text-primary flex h-16 w-16 items-center justify-center rounded-2xl shadow-xs sm:h-20 sm:w-20'>
            <Icons.chat className='h-8 w-8 sm:h-10 sm:w-10' />
          </div>
          <div className='max-w-md space-y-1.5'>
            <h3 className='text-foreground text-lg font-bold sm:text-xl'>Live Chat Platform</h3>
            <p className='text-muted-foreground text-xs leading-relaxed sm:text-sm'>
              Real-time multi-tenant messaging hub. When visitors connect or send messages from the chat widget, their conversations will appear in the sidebar automatically.
            </p>
          </div>
          <div className='flex items-center gap-2 rounded-full border border-border/50 bg-muted/40 px-3.5 py-1.5 text-xs text-muted-foreground'>
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                socketStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              )}
            />
            <span>WebSocket: {socketStatus === 'connected' ? 'Connected & Listening' : socketStatus}</span>
          </div>
        </div>
      )}
    </div>
  );
}
