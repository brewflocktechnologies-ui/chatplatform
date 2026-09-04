'use client';

import { Icons } from '@/components/icons';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Conversation } from '../utils/types';
import { useChatStore } from '../utils/store';

interface ChatHeaderProps {
  conversation: Conversation;
}

export function ChatHeader({ conversation }: ChatHeaderProps) {
  const typingMap = useChatStore((state) => state.typingMap);
  const isTyping = !!typingMap[conversation.id];

  return (
    <header className='flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3 sm:gap-4 sm:pb-3.5'>
      <div className='flex items-center gap-3'>
        <div className='relative'>
          <Avatar className='border-border/50 bg-background/80 text-foreground h-11 w-11 rounded-full border shadow-xs sm:h-12 sm:w-12'>
            <AvatarFallback className='bg-primary/15 text-primary text-sm font-semibold sm:text-base'>
              {conversation.initials}
            </AvatarFallback>
          </Avatar>
          <span
            className={cn(
              'border-background absolute right-0 bottom-0 inline-flex h-3.5 w-3.5 rounded-full border-2',
              conversation.status === 'online' ? 'bg-emerald-500' : 'bg-muted-foreground/40'
            )}
            aria-label={conversation.status === 'online' ? 'Online' : 'Offline'}
          />
        </div>
        <div>
          <div className='flex items-center gap-2'>
            <p className='text-foreground text-sm font-bold sm:text-base'>{conversation.name}</p>
            {conversation.status === 'online' && (
              <span className='inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400'>
                <span className='h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse' />
                online
              </span>
            )}
          </div>
          {isTyping ? (
            <p className='text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-xs font-medium'>
              <span className='h-1 w-1 rounded-full bg-emerald-500 animate-bounce' style={{ animationDelay: '0ms' }} />
              <span className='h-1 w-1 rounded-full bg-emerald-500 animate-bounce' style={{ animationDelay: '150ms' }} />
              <span className='h-1 w-1 rounded-full bg-emerald-500 animate-bounce' style={{ animationDelay: '300ms' }} />
              <span>typing...</span>
            </p>
          ) : (
            <p className='text-muted-foreground text-xs'>{conversation.title}</p>
          )}
        </div>
      </div>

      <div className='flex items-center gap-1.5 sm:gap-2'>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='border-border/40 bg-background/60 text-muted-foreground hover:bg-muted/60 focus-visible:ring-primary/40 focus-visible:ring-offset-background size-8 rounded-full border transition focus-visible:ring-2 focus-visible:ring-offset-2 sm:size-10'
          aria-label='Start audio call'
        >
          <Icons.phone className='h-3.5 w-3.5 sm:h-4 sm:w-4' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='border-border/40 bg-background/60 text-muted-foreground hover:bg-muted/60 focus-visible:ring-primary/40 focus-visible:ring-offset-background size-8 rounded-full border transition focus-visible:ring-2 focus-visible:ring-offset-2 sm:size-10'
          aria-label='Start video call'
        >
          <Icons.video className='h-3.5 w-3.5 sm:h-4 sm:w-4' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='border-border/40 bg-background/60 text-muted-foreground hover:bg-muted/60 focus-visible:ring-primary/40 focus-visible:ring-offset-background size-8 rounded-full border transition focus-visible:ring-2 focus-visible:ring-offset-2 sm:size-10'
          aria-label='Open conversation menu'
        >
          <Icons.ellipsis className='h-3.5 w-3.5 sm:h-4 sm:w-4' />
        </Button>
      </div>
    </header>
  );
}
