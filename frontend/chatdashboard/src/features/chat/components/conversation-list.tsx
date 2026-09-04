'use client';

import { useMemo, useState } from 'react';
import { Icons } from '@/components/icons';
import { motion } from 'motion/react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Conversation } from '../utils/types';
import { useChatStore } from '../utils/store';

type FilterTab = 'all' | 'unread' | 'online';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const typingMap = useChatStore((state) => state.typingMap);

  const counts = useMemo(() => {
    return {
      all: conversations.length,
      unread: conversations.filter((c) => c.unread > 0).length,
      online: conversations.filter((c) => c.status === 'online').length
    };
  }, [conversations]);

  const filtered = useMemo(() => {
    let list = conversations;

    if (filterTab === 'unread') {
      list = list.filter((c) => c.unread > 0);
    } else if (filterTab === 'online') {
      list = list.filter((c) => c.status === 'online');
    }

    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.messages.some((m) => m.text.toLowerCase().includes(q))
    );
  }, [conversations, filterTab, search]);

  return (
    <div className='border-border/50 bg-background/80 hidden h-full flex-col gap-3 overflow-hidden rounded-2xl border p-3.5 backdrop-blur-xl shadow-sm lg:col-start-1 lg:col-end-2 lg:flex lg:rounded-3xl lg:p-4'>
      {/* Header */}
      <div className='flex items-center justify-between gap-3 px-1 pt-0.5'>
        <div>
          <h2 className='text-foreground text-base font-bold tracking-tight'>Chats</h2>
          <p className='text-muted-foreground text-xs'>
            {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}
          </p>
        </div>
        <div className='flex items-center gap-1.5'>
          {counts.online > 0 && (
            <span className='inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400'>
              <span className='h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse' />
              {counts.online} online
            </span>
          )}
          <Badge
            variant='outline'
            className='bg-primary/10 text-primary border-primary/20 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider'
          >
            Live
          </Badge>
        </div>
      </div>

      {/* Search Input */}
      <div className='relative'>
        <Icons.search
          className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2'
          aria-hidden='true'
        />
        <Input
          id='messenger-search'
          type='search'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Search users or messages...'
          className='border-border/50 bg-muted/40 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/40 h-9 w-full rounded-xl pl-9 text-xs focus-visible:ring-2'
        />
        {search && (
          <button
            type='button'
            onClick={() => setSearch('')}
            className='text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 text-xs'
          >
            ✕
          </button>
        )}
      </div>

      {/* Filter Tabs (WhatsApp style pills) */}
      <div className='flex items-center gap-1.5 border-b border-border/40 pb-2 text-xs'>
        <button
          type='button'
          onClick={() => setFilterTab('all')}
          className={cn(
            'flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition',
            filterTab === 'all'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
          )}
        >
          All
          <span className={cn('text-[10px] opacity-80', filterTab === 'all' ? 'text-primary-foreground' : 'text-muted-foreground')}>
            {counts.all}
          </span>
        </button>
        <button
          type='button'
          onClick={() => setFilterTab('unread')}
          className={cn(
            'flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition',
            filterTab === 'unread'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
          )}
        >
          Unread
          {counts.unread > 0 && (
            <span className={cn(
              'rounded-full px-1.5 py-0.2 text-[10px] font-bold',
              filterTab === 'unread' ? 'bg-white/20 text-white' : 'bg-emerald-500 text-white'
            )}>
              {counts.unread}
            </span>
          )}
        </button>
        <button
          type='button'
          onClick={() => setFilterTab('online')}
          className={cn(
            'flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition',
            filterTab === 'online'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
          )}
        >
          Online
          <span className={cn('text-[10px] opacity-80', filterTab === 'online' ? 'text-primary-foreground' : 'text-muted-foreground')}>
            {counts.online}
          </span>
        </button>
      </div>

      {/* Conversations List (WhatsApp Layout) */}
      <div
        className='flex-1 space-y-1.5 overflow-y-auto pr-0.5'
        aria-label='User conversations list'
        role='list'
      >
        {filtered.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-12 text-center px-4'>
            <div className='mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground'>
              <Icons.chat className='h-6 w-6' />
            </div>
            <p className='text-foreground text-xs font-semibold'>
              {conversations.length === 0 ? 'No active chats yet' : 'No matching conversations'}
            </p>
            <p className='text-muted-foreground mt-1 text-[11px] leading-relaxed'>
              {conversations.length === 0
                ? 'When visitors join or send a message from the widget, they will appear here.'
                : 'Try adjusting your search or active filter tab.'}
            </p>
          </div>
        ) : null}

        {filtered.map((conversation) => {
          const isActive = conversation.id === selectedId;
          const lastMessage = conversation.messages[conversation.messages.length - 1];
          const isTyping = !!typingMap[conversation.id];
          const isSentByAgent = lastMessage?.sender === 'user';

          return (
            <motion.button
              key={conversation.id}
              type='button'
              onClick={() => onSelect(conversation.id)}
              aria-current={isActive ? 'true' : undefined}
              className={cn(
                'group relative flex w-full items-center gap-3 rounded-xl border border-transparent p-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                isActive
                  ? 'bg-primary/10 border-primary/30 shadow-xs'
                  : 'hover:bg-muted/50 active:bg-muted/70'
              )}
              role='listitem'
            >
              {/* Avatar with Status Indicator */}
              <div className='relative shrink-0'>
                <Avatar className='h-11 w-11 rounded-full border border-border/40 bg-background/80 shadow-xs'>
                  <AvatarFallback className='bg-primary/15 text-primary text-sm font-semibold'>
                    {conversation.initials}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    'absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-background',
                    conversation.status === 'online' ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                  )}
                  aria-label={conversation.status === 'online' ? 'Online' : 'Offline'}
                />
              </div>

              {/* Chat details */}
              <div className='min-w-0 flex-1'>
                {/* Top Row: User Name & Timestamp */}
                <div className='flex items-center justify-between gap-1.5'>
                  <p className='text-foreground truncate text-sm font-semibold'>
                    {conversation.name}
                  </p>
                  {lastMessage && (
                    <span
                      className={cn(
                        'shrink-0 text-[11px]',
                        conversation.unread > 0 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-muted-foreground'
                      )}
                    >
                      {lastMessage.timestamp}
                    </span>
                  )}
                </div>

                {/* Bottom Row: Message snippet / Typing & Unread badge */}
                <div className='mt-0.5 flex items-center justify-between gap-2'>
                  <div className='min-w-0 flex-1'>
                    {isTyping ? (
                      <span className='text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-xs font-medium'>
                        <span className='h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce' style={{ animationDelay: '0ms' }} />
                        <span className='h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce' style={{ animationDelay: '150ms' }} />
                        <span className='h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce' style={{ animationDelay: '300ms' }} />
                        <span>typing...</span>
                      </span>
                    ) : lastMessage ? (
                      <p className='text-muted-foreground flex items-center gap-1 truncate text-xs'>
                        {isSentByAgent && (
                          <Icons.checks
                            className='text-primary shrink-0 h-3.5 w-3.5'
                            aria-label='Sent'
                          />
                        )}
                        <span className='truncate'>{lastMessage.text}</span>
                      </p>
                    ) : (
                      <p className='text-muted-foreground text-xs italic'>No messages yet</p>
                    )}
                  </div>

                  {/* WhatsApp-style Unread Badge */}
                  {conversation.unread > 0 && (
                    <span className='bg-emerald-500 text-white shadow-xs ml-1 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold'>
                      {conversation.unread}
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

