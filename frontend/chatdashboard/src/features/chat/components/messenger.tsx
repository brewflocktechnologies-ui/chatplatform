'use client';

import { DetailsRail } from './details-rail';
import { type SyntheticEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { useChatStore } from '../utils/store';
import type { Attachment, Message, DetailsTab } from '../utils/types';
import { ConversationList } from './conversation-list';
import { ChatArea } from './chat-area';
import { ChatDetails } from './chat-details';
import { chatDashboardSocket } from '../services/chat-socket-client';
import { chatSocketUrl } from '@/config/api-endpoints';
import { Icons } from '@/components/icons';
import { cn, randomId } from '@/lib/utils';

const ChatIcon = Icons.chat;

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
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(true);
  const [detailsTab, setDetailsTab] = useState<DetailsTab>('info');

  const shouldReduceMotion = useReducedMotion();
  const replyTimeoutRef = useRef<number | null>(null);
  const selectedRef = useRef(selectedConversationId);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize socket on mount
  useEffect(() => {
    const wsUrl = chatSocketUrl();
    initSocket(wsUrl, 'demo-tenant');
  }, [initSocket]);

  const handleSelectConversation = useCallback(
    (id: string) => {
      setAttachments([]);
      selectConversation(id);
    },
    [selectConversation]
  );

  useEffect(() => {
    selectedRef.current = selectedConversationId;
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
      id: 'file-' + Date.now() + '-' + randomId(5),
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
    (e: SyntheticEvent<HTMLFormElement>) => {
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
    <div className='flex h-full w-full overflow-hidden bg-background'>
      <h1 className='sr-only'>Live chat dashboard</h1>
      {/* 1. Left Conversations Sidebar */}
      <ConversationList
        conversations={conversations}
        selectedId={selectedConversationId}
        onSelect={handleSelectConversation}
      />

      {/* 2. Center Message Transcript / Active Chat Area */}
      {activeConversation ? (
        <ChatArea
          conversation={activeConversation}
          draft={draft}
          onDraftChange={handleDraftChange}
          onSubmit={handleSubmit}
          attachments={attachments}
          onAddAttachments={handleAddAttachments}
          onRemoveAttachment={handleRemoveAttachment}
          isDetailsOpen={isDetailsOpen}
          onToggleDetails={() => setIsDetailsOpen((prev) => !prev)}
          onBack={() => selectConversation('')}
        />
      ) : (
        <div className='flex flex-1 flex-col bg-background overflow-hidden min-w-0'>
          <div className='flex items-center justify-between border-b border-border/60 px-4 sm:px-5 h-[56px] shrink-0 bg-background/50'>
            <h3 className='text-sm font-semibold tracking-tight text-foreground'>Messages</h3>
          </div>
          <div className='flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center'>
            <div className='bg-primary/10 text-primary flex h-16 w-16 items-center justify-center rounded-2xl shadow-xs'>
              <ChatIcon className='h-8 w-8' />
            </div>
            <div className='max-w-md space-y-1.5'>
              <h3 className='text-foreground text-base font-bold sm:text-lg'>Live Chat Platform</h3>
              <p className='text-muted-foreground text-xs leading-relaxed sm:text-sm'>
                Select a conversation from the sidebar to inspect or reply, or wait for new visitor
                messages from the chat widget.
              </p>
            </div>
            <div className='flex items-center gap-2 rounded-full border border-border/50 bg-muted/40 px-3.5 py-1.5 text-xs text-muted-foreground'>
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  socketStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                )}
              />
              <span>
                WebSocket: {socketStatus === 'connected' ? 'Connected & Listening' : socketStatus}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Right Details & Metadata Drawer */}
      {activeConversation && isDetailsOpen && (
        <ChatDetails
          conversation={activeConversation}
          isOpen={isDetailsOpen}
          onToggle={() => setIsDetailsOpen(false)}
          activeTab={detailsTab}
          onTabChange={setDetailsTab}
          onInsertCanned={handleDraftChange}
        />
      )}

      {/* 4. Sleek Reopen Rail when details panel is collapsed */}
      {activeConversation && !isDetailsOpen && (
        <DetailsRail
          infoLabel='Visitor Details'
          onOpen={(tab) => {
            if (tab) setDetailsTab(tab);
            setIsDetailsOpen(true);
          }}
        />
      )}
    </div>
  );
}
