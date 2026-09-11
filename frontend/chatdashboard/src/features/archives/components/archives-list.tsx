'use client';

import { useState, useMemo } from 'react';
import type { ArchivedChat } from '../types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ArchivesListProps {
  chats: ArchivedChat[];
  selectedId: string;
  onSelect: (id: string) => void;
  totalCount: number;
}

export function ArchivesList({ chats, selectedId, onSelect, totalCount }: ArchivesListProps) {
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [activeFilterTag, setActiveFilterTag] = useState<string | null>(null);

  // Filter and sort chats
  const filteredChats = useMemo(() => {
    return (
      chats
        .filter((chat) => {
          const matchesSearch =
            search.trim() === '' ||
            chat.customerName.toLowerCase().includes(search.toLowerCase()) ||
            chat.snippet.toLowerCase().includes(search.toLowerCase()) ||
            chat.agent.toLowerCase().includes(search.toLowerCase()) ||
            chat.date.toLowerCase().includes(search.toLowerCase()) ||
            chat.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

          const matchesTag = !activeFilterTag || chat.tags.includes(activeFilterTag);

          return matchesSearch && matchesTag;
        })
        .slice()
        // eslint-disable-next-line unicorn/no-array-sort
        .sort((a, b) => {
          if (sortOrder === 'oldest') {
            return a.id.localeCompare(b.id);
          }
          return b.id.localeCompare(a.id);
        })
    );
  }, [chats, search, activeFilterTag, sortOrder]);

  return (
    <div className='flex h-full w-full flex-col border-r border-border/70 bg-card/60 sm:w-[320px] md:w-[340px] shrink-0 overflow-hidden'>
      {/* Top Header */}
      <div className='flex items-center justify-between border-b border-border/60 px-4 h-[56px] shrink-0 bg-background/50'>
        <h2 className='text-sm font-semibold tracking-tight text-foreground'>Archives</h2>
        <div className='flex items-center gap-1'>
          <Button
            variant='ghost'
            size='icon-sm'
            className='h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer'
            title='Export or Refresh'
          >
            <Icons.refresh className='h-4 w-4' />
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className='space-y-2 border-b border-border/50 p-3'>
        <div className='relative'>
          <Icons.search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='Search in archives...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='h-9 pl-8 text-xs bg-background/80 placeholder:text-muted-foreground/80'
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className='absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
            >
              <Icons.close className='h-3.5 w-3.5' />
            </button>
          )}
        </div>

        {/* Filter Trigger Button */}
        <div className='flex items-center gap-2'>
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant='outline'
                  size='sm'
                  className='h-7 px-2.5 text-xs font-normal text-muted-foreground hover:text-foreground border-dashed'
                />
              }
            >
              <Icons.add className='mr-1 h-3 w-3' />
              {activeFilterTag ? `Filter: ${activeFilterTag}` : 'Add filter'}
            </PopoverTrigger>
            <PopoverContent align='start' className='w-48 p-2'>
              <div className='space-y-1'>
                <p className='text-[11px] font-medium text-muted-foreground px-1 pb-1'>
                  Filter by tag
                </p>
                <Button
                  variant={activeFilterTag === null ? 'secondary' : 'ghost'}
                  size='sm'
                  className='w-full justify-start text-xs h-7'
                  onClick={() => setActiveFilterTag(null)}
                >
                  All chats
                </Button>
                <Button
                  variant={activeFilterTag === 'lead' ? 'secondary' : 'ghost'}
                  size='sm'
                  className='w-full justify-start text-xs h-7'
                  onClick={() => setActiveFilterTag('lead')}
                >
                  <span className='mr-1.5 h-2 w-2 rounded-full bg-amber-500' />
                  lead
                </Button>
                <Button
                  variant={activeFilterTag === 'botengine-transfer' ? 'secondary' : 'ghost'}
                  size='sm'
                  className='w-full justify-start text-xs h-7'
                  onClick={() => setActiveFilterTag('botengine-transfer')}
                >
                  <span className='mr-1.5 h-2 w-2 rounded-full bg-blue-500' />
                  botengine-transfer
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {activeFilterTag && (
            <Button
              variant='ghost'
              size='sm'
              className='h-7 px-2 text-xs text-muted-foreground hover:text-destructive'
              onClick={() => setActiveFilterTag(null)}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Summary / Sort Controls Row */}
      <div className='flex items-center justify-between border-b border-border/40 px-4 py-2 text-xs text-muted-foreground bg-muted/20'>
        <span>{totalCount.toLocaleString()} chats</span>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                aria-label='Sort chats'
                className='flex items-center gap-1 font-medium text-foreground/80 hover:text-foreground'
              />
            }
          >
            <span>{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</span>
            <Icons.chevronDown className='h-3 w-3' />
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={() => setSortOrder('newest')}>Newest</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortOrder('oldest')}>Oldest</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Chat Record List */}
      <div className='flex-1 overflow-y-auto divide-y divide-border/40'>
        {filteredChats.length === 0 ? (
          <div className='p-6 text-center text-xs text-muted-foreground'>
            No archived chats match your filter.
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isSelected = chat.id === selectedId;
            return (
              <button
                type='button'
                key={chat.id}
                onClick={() => onSelect(chat.id)}
                className={cn(
                  'w-full group relative cursor-pointer px-4 py-3 transition-colors text-left select-none block',
                  isSelected
                    ? 'bg-accent/70 border-l-4 border-l-primary font-normal'
                    : 'hover:bg-muted/40 border-l-4 border-l-transparent'
                )}
              >
                {/* Row 1: Customer Name & Date */}
                <div className='flex items-center justify-between gap-2'>
                  <span
                    className={cn(
                      'text-xs font-semibold truncate',
                      isSelected ? 'text-foreground font-bold' : 'text-foreground/90'
                    )}
                  >
                    {chat.customerName}
                  </span>
                  <span className='text-[11px] text-muted-foreground shrink-0'>{chat.date}</span>
                </div>

                {/* Row 2: Assigned Agent */}
                <div className='mt-0.5 text-[11px] text-muted-foreground'>Agent: {chat.agent}</div>

                {/* Row 3: Snippet & Message Count Badge */}
                <div className='mt-1.5 flex items-start justify-between gap-2'>
                  <p className='text-xs text-muted-foreground/90 line-clamp-1 flex-1 font-normal'>
                    {chat.snippet}
                  </p>
                  <span className='flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-medium text-muted-foreground border border-border/40 shrink-0'>
                    {chat.messageCount}
                  </span>
                </div>

                {/* Row 4: Tag badges (if any) */}
                {chat.tags && chat.tags.length > 0 && (
                  <div className='mt-2 flex flex-wrap items-center gap-1.5'>
                    <span
                      className='inline-block h-2 w-2 rounded-full bg-emerald-500'
                      title='Closed'
                    />
                    {chat.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant='secondary'
                        className={cn(
                          'h-4.5 px-1.5 py-0 text-[10px] font-normal border',
                          tag === 'lead'
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                            : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
                        )}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
