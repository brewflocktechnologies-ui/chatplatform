'use client';

import { DetailsRail } from '@/features/chat/components/details-rail';
import { useState } from 'react';
import { MOCK_ARCHIVED_CHATS, TOTAL_ARCHIVED_COUNT } from '@/constants/mock-api-archives';
import type { ArchivedChat } from '../types';
import { ArchivesList } from './archives-list';
import { ArchivesTranscript } from './archives-transcript';
import { ArchivesDetails, type DetailsTab } from './archives-details';


export default function ArchivesView() {
  const [chats, setChats] = useState<ArchivedChat[]>(MOCK_ARCHIVED_CHATS);
  // Default to chat-5 ("Test 10.11") matching the exact screenshot
  const [selectedId, setSelectedId] = useState<string>('chat-5');
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(true);
  const [detailsTab, setDetailsTab] = useState<DetailsTab>('info');

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
      <h1 className='sr-only'>Chat archives</h1>
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
        <div className='flex flex-1 flex-col bg-background overflow-hidden min-w-0'>
          <div className='flex items-center justify-between border-b border-border/60 px-4 sm:px-6 h-[56px] shrink-0 bg-background/50'>
            <h3 className='text-sm font-semibold tracking-tight text-foreground'>Transcript</h3>
          </div>
          <div className='flex flex-1 items-center justify-center text-sm text-muted-foreground'>
            Select an archived chat to inspect.
          </div>
        </div>
      )}

      {/* 3. Right Details & Metadata Drawer */}
      {activeChat && isDetailsOpen && (
        <ArchivesDetails
          chat={activeChat}
          isOpen={isDetailsOpen}
          onToggle={() => setIsDetailsOpen(false)}
          activeTab={detailsTab}
          onTabChange={setDetailsTab}
        />
      )}

      {/* 4. Sleek Reopen Rail when details panel is collapsed */}
      {activeChat && !isDetailsOpen && (
        <DetailsRail
          infoLabel='Customer Details'
          onOpen={(tab) => {
            if (tab) setDetailsTab(tab);
            setIsDetailsOpen(true);
          }}
        />
      )}
    </div>
  );
}
