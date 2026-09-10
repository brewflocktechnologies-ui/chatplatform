'use client';

import { useState, type FormEvent } from 'react';
import type { ArchivedChat } from '../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Icons } from '@/components/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ArchivesTranscriptProps {
  chat: ArchivedChat;
  onNavigateChat?: (chatId: string) => void;
  onAddTag: (chatId: string, tag: string) => void;
  onRemoveTag: (chatId: string, tag: string) => void;
  isDetailsOpen?: boolean;
  onToggleDetails?: () => void;
}

export function ArchivesTranscript({
  chat,
  onNavigateChat,
  onAddTag,
  onRemoveTag,
  isDetailsOpen,
  onToggleDetails
}: ArchivesTranscriptProps) {
  const [newTag, setNewTag] = useState('');
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);

  const handleAddTagSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (newTag.trim() && !chat.tags.includes(newTag.trim())) {
      onAddTag(chat.id, newTag.trim());
      setNewTag('');
      setTagPopoverOpen(false);
    }
  };

  return (
    <div className='flex h-full flex-1 flex-col bg-background overflow-hidden'>
      {/* 1. Header Bar */}
      <div className='flex items-center justify-between border-b border-border/60 px-6 py-3 shrink-0'>
        <div className='flex items-center gap-2'>
          <h3 className='text-sm font-semibold text-foreground tracking-tight'>
            {chat.customerName} and {chat.agent}
          </h3>
        </div>

        <div className='flex items-center gap-1.5 text-muted-foreground'>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant='ghost'
                  size='icon-sm'
                  className='h-8 w-8 text-muted-foreground hover:text-foreground'
                />
              }
            >
              <Icons.share className='h-4 w-4' />
            </TooltipTrigger>
            <TooltipContent>Link or Merge Conversation</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant='ghost'
                  size='icon-sm'
                  className='h-8 w-8 text-muted-foreground hover:text-foreground'
                />
              }
            >
              <Icons.moreHorizontal className='h-4 w-4' />
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem
                onClick={() => navigator.clipboard?.writeText(chat.chatInfo.chatId)}
              >
                <Icons.code className='mr-2 h-4 w-4' /> Copy Chat ID
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.print()}>
                <Icons.page className='mr-2 h-4 w-4' /> Print Transcript
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {onToggleDetails && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant='ghost'
                    size='icon-sm'
                    onClick={onToggleDetails}
                    className={cn(
                      'h-8 w-8 text-muted-foreground hover:text-foreground transition-colors',
                      isDetailsOpen && 'bg-accent text-foreground'
                    )}
                  />
                }
              >
                <Icons.user className='h-4 w-4' />
              </TooltipTrigger>
              <TooltipContent>{isDetailsOpen ? 'Hide Details' : 'Show Details'}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* 2. Main Scrollable Message Stream */}
      <div className='flex-1 overflow-y-auto px-6 py-6 space-y-6'>
        {/* Previous Chat Button */}
        <div className='flex justify-center'>
          <Button
            variant='outline'
            size='sm'
            disabled={!chat.previousChatId}
            onClick={() => chat.previousChatId && onNavigateChat?.(chat.previousChatId)}
            className={cn(
              'h-7 rounded-full px-4 text-xs font-medium shadow-2xs border-border/70 text-blue-600 dark:text-blue-400 bg-background hover:bg-muted/40',
              !chat.previousChatId && 'opacity-60 cursor-not-allowed text-muted-foreground'
            )}
          >
            <Icons.chevronUp className='mr-1.5 h-3.5 w-3.5' />
            Previous chat with this customer
          </Button>
        </div>

        {/* Started At Timestamp Divider */}
        <div className='flex items-center justify-center'>
          <div className='rounded-full bg-muted/40 px-3.5 py-1 text-[11px] text-muted-foreground border border-border/30'>
            {chat.timestamp}
          </div>
        </div>

        {/* Messages Stream */}
                <div className='w-full space-y-4'>
          {chat.messages.map((message) => {
            // Case A: Pre-chat form card (visitor side)
            if (message.type === 'pre-chat-form' && message.formData) {
              return (
                <div key={message.id} className='flex items-start gap-3 justify-start'>
                  <Avatar className='h-7 w-7 shrink-0 text-white font-semibold text-xs bg-purple-600'>
                    <AvatarFallback className='bg-purple-600 text-white'>
                      {chat.customer.initials || 'T'}
                    </AvatarFallback>
                  </Avatar>

                  <div className='w-full max-w-sm rounded-xl border border-border/80 bg-card p-4 shadow-2xs'>
                    <div className='flex items-center justify-between pb-2 mb-2 border-b border-border/40'>
                      <div className='flex items-center gap-1.5 text-xs font-semibold text-foreground/90'>
                        <Icons.forms className='h-3.5 w-3.5 text-muted-foreground' />
                        <span>Pre-chat form</span>
                      </div>
                      <span className='text-[10px] text-muted-foreground'>{message.timestamp}</span>
                    </div>

                    <div className='space-y-2 text-xs'>
                      {Object.entries(message.formData).map(([key, value]) => (
                        <div key={key} className='flex flex-col text-[11px]'>
                          <span className='text-muted-foreground capitalize font-medium'>
                            {key}:
                          </span>
                          <span className='text-foreground font-normal break-all'>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            // Case B: System Closed / Archived Notification
            if (message.type === 'system-closed') {
              return (
                <div key={message.id} className='flex justify-center py-2'>
                  <span className='text-[11px] text-muted-foreground bg-muted/30 px-3 py-1 rounded-full border border-border/30'>
                    {message.text || `Archived - closed by agent • ${message.timestamp}`}
                  </span>
                </div>
              );
            }

            // Case C: Agent Message (Right aligned, Dan's blue bubble)
            if (message.sender === 'agent') {
              return (
                <div key={message.id} className='flex items-end justify-end gap-2.5'>
                  <div className='flex flex-col items-end'>
                    <span className='text-[10px] text-muted-foreground mr-1 mb-1 font-medium'>
                      {message.author}
                    </span>
                    <div className='rounded-2xl rounded-br-xs bg-[#0066ff] px-4 py-2 text-xs text-white shadow-xs max-w-md'>
                      {message.text}
                    </div>
                  </div>

                  <Avatar className='h-7 w-7 shrink-0 ring-1 ring-border/50'>
                    <AvatarImage src={message.avatar} alt={message.author} />
                    <AvatarFallback className='bg-blue-600 text-white text-[11px] font-medium'>
                      {message.author.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              );
            }

            // Case D: Visitor Message (Left aligned, gray bubble with purple avatar)
            return (
              <div key={message.id} className='flex items-start gap-2.5 justify-start'>
                <Avatar className='h-7 w-7 shrink-0 text-white font-medium text-[11px] bg-purple-600'>
                  <AvatarFallback className='bg-purple-600 text-white'>
                    {chat.customer.initials || 'T'}
                  </AvatarFallback>
                </Avatar>

                <div className='flex flex-col items-start'>
                  <span className='text-[10px] text-muted-foreground ml-1 mb-1 font-medium'>
                    {message.author}
                  </span>
                  <div className='rounded-2xl rounded-tl-xs bg-muted/80 px-4 py-2 text-xs text-foreground shadow-2xs max-w-md border border-border/30'>
                    {message.text}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Next Chat Button */}
        <div className='flex justify-center pt-2'>
          <Button
            variant='outline'
            size='sm'
            disabled={!chat.nextChatId}
            onClick={() => chat.nextChatId && onNavigateChat?.(chat.nextChatId)}
            className={cn(
              'h-7 rounded-full px-4 text-xs font-medium shadow-2xs border-border/70 text-blue-600 dark:text-blue-400 bg-background hover:bg-muted/40',
              !chat.nextChatId && 'opacity-60 cursor-not-allowed text-muted-foreground'
            )}
          >
            <Icons.chevronDown className='mr-1.5 h-3.5 w-3.5' />
            Next chat with this customer
          </Button>
        </div>
      </div>

      {/* 3. Bottom Tags Management Bar */}
      <div className='flex items-center gap-2 border-t border-border/60 bg-muted/10 px-6 py-2.5 shrink-0'>
        <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
          <PopoverTrigger
            render={
              <Button
                variant='ghost'
                size='sm'
                className='h-7 px-2 text-xs font-normal text-muted-foreground hover:text-foreground'
              />
            }
          >
            <Icons.add className='mr-1 h-3.5 w-3.5' />
            Add tag
          </PopoverTrigger>
          <PopoverContent align='start' className='w-56 p-2'>
            <form onSubmit={handleAddTagSubmit} className='space-y-2'>
              <p className='text-xs font-semibold text-foreground'>New Tag</p>
              <Input
                placeholder='e.g. priority, complaint'
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className='h-8 text-xs'
                autoFocus
              />
              <div className='flex justify-end gap-1.5'>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='h-7 text-xs'
                  onClick={() => setTagPopoverOpen(false)}
                >
                  Cancel
                </Button>
                <Button type='submit' size='sm' className='h-7 text-xs'>
                  Add
                </Button>
              </div>
            </form>
          </PopoverContent>
        </Popover>

        {chat.tags && chat.tags.length > 0 ? (
          <div className='flex flex-wrap items-center gap-1.5'>
            {chat.tags.map((tag) => (
              <Badge
                key={tag}
                variant='secondary'
                className='h-6 gap-1 px-2 text-xs font-normal bg-muted border border-border/50 text-foreground'
              >
                <span>{tag}</span>
                <button
                  onClick={() => onRemoveTag(chat.id, tag)}
                  className='text-muted-foreground hover:text-destructive'
                  title='Remove tag'
                >
                  <Icons.close className='h-3 w-3' />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <span className='text-xs text-muted-foreground italic'>No tags assigned</span>
        )}
      </div>
    </div>
  );
}
