'use client';

import { useState } from 'react';
import { MOCK_ARCHIVED_CHATS, TOTAL_ARCHIVED_COUNT } from '@/constants/mock-api-archives';
import type { ArchivedChat } from '../types';
import { ArchivesList } from './archives-list';
import { ArchivesTranscript } from './archives-transcript';
import { ArchivesDetails } from './archives-details';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function ArchivesView() {
  const [chats, setChats] = useState<ArchivedChat[]>(MOCK_ARCHIVED_CHATS);
  // Default to chat-5 ("Test 10.11") matching the exact screenshot
  const [selectedId, setSelectedId] = useState<string>('chat-5');
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(true);

  const activeChat = chats.find((c) => c.id === selectedId) || chats[0];

  const handleAddTag = (chatId: string, tag: string) => {
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === chatId && !c.tags.includes(tag)) {
          return { ...c, tags: [...c.tags, tag] };
        }
        return c;
      })
    );
  };

  const handleRemoveTag = (chatId: string, tag: string) => {
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === chatId) {
          return { ...c, tags: c.tags.filter((t) => t !== tag) };
        }
        return c;
      })
    );
  };

  return (
    <div className='flex h-[calc(100dvh-4rem)] w-full overflow-hidden border-t border-border/60 bg-background'>
      {/* 1. Left Archives Sidebar */}
      <ArchivesList
        chats={chats}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId(id)}
        totalCount={TOTAL_ARCHIVED_COUNT}
      />

      {/* 2. Center Message Transcript */}
      {activeChat ? (
        <ArchivesTranscript
          chat={activeChat}
          onNavigateChat={(id) => setSelectedId(id)}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
          isDetailsOpen={isDetailsOpen}
          onToggleDetails={() => setIsDetailsOpen((prev) => !prev)}
        />
      ) : (
        <div className='flex flex-1 items-center justify-center text-sm text-muted-foreground'>
          Select an archived chat to inspect.
        </div>
      )}

      {/* 3. Right Details & Metadata Drawer */}
      {activeChat && isDetailsOpen && (
        <ArchivesDetails
          chat={activeChat}
          isOpen={isDetailsOpen}
          onToggle={() => setIsDetailsOpen(false)}
        />
      )}

      {/* 4. Sleek Reopen Rail when details panel is collapsed */}
      {activeChat && !isDetailsOpen && (
        <div className='flex h-full w-10 flex-col items-center border-l border-border/60 bg-card/40 py-3 shrink-0'>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant='ghost'
                  size='icon-sm'
                  onClick={() => setIsDetailsOpen(true)}
                  className='h-7 w-7 text-muted-foreground hover:text-foreground'
                />
              }
            >
              <Icons.chevronLeft className='h-4 w-4' />
            </TooltipTrigger>
            <TooltipContent side='left'>Open Details Panel</TooltipContent>
          </Tooltip>

          <div className='mt-4 flex flex-col gap-2'>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type='button'
                    aria-label='Customer Details'
                    onClick={() => setIsDetailsOpen(true)}
                    className='flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors'
                  />
                }
              >
                <Icons.user className='h-3.5 w-3.5' />
              </TooltipTrigger>
              <TooltipContent side='left'>Customer Details</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type='button'
                    aria-label='Notes & Canned Responses'
                    onClick={() => setIsDetailsOpen(true)}
                    className='flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors'
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
                    onClick={() => setIsDetailsOpen(true)}
                    className='flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors'
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
