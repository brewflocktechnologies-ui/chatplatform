'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { useChatStore } from '../utils/store';
import type { Attachment, Message, DetailsTab } from '../utils/types';
import { ConversationList } from './conversation-list';
import { ChatArea } from './chat-area';
import { ChatDetails } from './chat-details';
import { chatDashboardSocket } from '../services/chat-socket-client';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, randomId } from '@/lib/utils';

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
    const wsUrl = process.env.NEXT_PUBLIC_CHAT_WS_URL || 'ws://localhost:8088';
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
    <div className='flex h-full w-full overflow-hidden bg-background'>
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
              <Icons.chat className='h-8 w-8' />
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
        <div className='flex h-full w-10 flex-col items-center border-l border-border/60 bg-card/40 shrink-0'>
          <div className='flex h-[56px] w-full items-center justify-center border-b border-border/60 shrink-0'>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant='ghost'
                    size='icon-sm'
                    onClick={() => setIsDetailsOpen(true)}
                    className='h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer'
                    aria-label='Open Details Panel'
                  />
                }
              >
                <Icons.chevronLeft className='h-4 w-4' />
              </TooltipTrigger>
              <TooltipContent side='left'>Open Details Panel</TooltipContent>
            </Tooltip>
          </div>

          <div className='mt-3 flex flex-col gap-2'>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type='button'
                    aria-label='Visitor Details'
                    onClick={() => {
                      setDetailsTab('info');
                      setIsDetailsOpen(true);
                    }}
                    className='flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors cursor-pointer'
                  />
                }
              >
                <Icons.user className='h-3.5 w-3.5' />
              </TooltipTrigger>
              <TooltipContent side='left'>Visitor Details</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type='button'
                    aria-label='Notes & Canned Responses'
                    onClick={() => {
                      setDetailsTab('canned');
                      setIsDetailsOpen(true);
                    }}
                    className='flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors cursor-pointer'
                  />
                }
              >
                <Icons.post className='h-3.5 w-3.5' />
              </TooltipTrigger>
              <TooltipContent side='left'>Notes & Canned Responses</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type='button'
                    aria-label='Apps & Integrations'
                    onClick={() => {
                      setDetailsTab('apps');
                      setIsDetailsOpen(true);
                    }}
                    className='flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors cursor-pointer'
                  />
                }
              >
                <Icons.galleryVerticalEnd className='h-3.5 w-3.5' />
              </TooltipTrigger>
              <TooltipContent side='left'>Apps & Integrations</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  );
}
