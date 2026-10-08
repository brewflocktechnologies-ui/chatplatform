'use client';

import { Icons } from '@/components/icons';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Conversation } from '../utils/types';
import { useChatStore } from '../utils/store';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ChatHeaderProps {
  conversation: Conversation;
  isDetailsOpen?: boolean;
  onToggleDetails?: () => void;
  onBack?: () => void;
}

export function ChatHeader({
  conversation,
  isDetailsOpen,
  onToggleDetails,
  onBack
}: ChatHeaderProps) {
  const typingMap = useChatStore((state) => state.typingMap);
  const isTyping = !!typingMap[conversation.id];

  return (
    <header className='flex items-center justify-between gap-3 border-b border-border/60 px-4 sm:px-5 h-[56px] shrink-0 bg-background/50'>
      <div className='flex items-center gap-2.5 min-w-0'>
        {onBack && (
          <Button
            type='button'
            variant='ghost'
            size='icon-sm'
            onClick={onBack}
            className='md:hidden h-8 w-8 -ml-1 text-muted-foreground hover:text-foreground shrink-0'
            aria-label='Back to conversations'
          >
            <Icons.chevronLeft className='h-4 w-4' />
          </Button>
        )}

        <div className='relative shrink-0'>
          <Avatar className='border border-border/50 bg-background text-foreground h-8 w-8 rounded-full shadow-2xs'>
            <AvatarFallback className='bg-primary/15 text-primary text-xs font-semibold'>
              {conversation.initials}
            </AvatarFallback>
          </Avatar>
          <span
            className={cn(
              'border-background absolute right-0 bottom-0 inline-flex h-2.5 w-2.5 rounded-full border-2',
              conversation.status === 'online' ? 'bg-emerald-500' : 'bg-muted-foreground/40'
            )}
            aria-label={conversation.status === 'online' ? 'Online' : 'Offline'}
          />
        </div>

        <div className='min-w-0'>
          <div className='flex items-center gap-1.5'>
            <p className='text-foreground text-sm font-semibold tracking-tight truncate'>
              {conversation.name}
            </p>
            {conversation.status === 'online' && !isTyping && (
              <span className='inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0'>
                <span className='h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse' />
                online
              </span>
            )}
          </div>

          {isTyping ? (
            <p className='text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[11px] font-medium leading-none mt-0.5'>
              <span
                className='h-1 w-1 rounded-full bg-emerald-500 animate-bounce'
                style={{ animationDelay: '0ms' }}
              />
              <span
                className='h-1 w-1 rounded-full bg-emerald-500 animate-bounce'
                style={{ animationDelay: '150ms' }}
              />
              <span
                className='h-1 w-1 rounded-full bg-emerald-500 animate-bounce'
                style={{ animationDelay: '300ms' }}
              />
              <span>typing...</span>
            </p>
          ) : (
            <p className='text-muted-foreground text-[11px] truncate leading-none mt-0.5'>
              {conversation.title}
            </p>
          )}
        </div>
      </div>

      <div className='flex items-center gap-1.5 sm:gap-2'>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type='button'
                variant='ghost'
                size='icon-sm'
                className='h-8 w-8 text-muted-foreground hover:text-foreground'
                aria-label='Start audio call'
              />
            }
          >
            <Icons.phone className='h-3.5 w-3.5' />
          </TooltipTrigger>
          <TooltipContent>Start audio call</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type='button'
                variant='ghost'
                size='icon-sm'
                className='h-8 w-8 text-muted-foreground hover:text-foreground'
                aria-label='Start video call'
              />
            }
          >
            <Icons.video className='h-3.5 w-3.5' />
          </TooltipTrigger>
          <TooltipContent>Start video call</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type='button'
                variant='ghost'
                size='icon-sm'
                className='h-8 w-8 text-muted-foreground hover:text-foreground'
                aria-label='More options'
              />
            }
          >
            <Icons.ellipsis className='h-3.5 w-3.5' />
          </TooltipTrigger>
          <TooltipContent>More options</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
