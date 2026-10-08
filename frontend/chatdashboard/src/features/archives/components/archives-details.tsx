'use client';

import { useState, type FormEvent } from 'react';
import type { ArchivedChat } from '../types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export type DetailsTab = 'info' | 'canned' | 'apps';

function copyToClipboard(text: string, label: string) {
  navigator.clipboard?.writeText(text);
  toast.success(`Copied ${label} to clipboard`);
}

interface ArchivesDetailsProps {
  chat: ArchivedChat;
  isOpen: boolean;
  onToggle: () => void;
  activeTab: DetailsTab;
  onTabChange: (tab: DetailsTab) => void;
}

interface AgentNote {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

const DEFAULT_NOTES: Record<string, AgentNote[]> = {
  'chat-5': [
    {
      id: 'note-1',
      author: 'Dan',
      text: 'Customer reached out regarding API integration. Follow-up email sent with docs.',
      createdAt: 'Mar 28, 2022'
    },
    {
      id: 'note-2',
      author: 'Support Bot',
      text: 'Transferred from BotEngine to live agent queue after lead qualification.',
      createdAt: 'Mar 28, 2022'
    }
  ]
};

const CANNED_RESPONSES = [
  {
    title: 'Greeting & Welcome',
    text: 'Hello! Thanks for reaching out. How can I assist you today?'
  },
  {
    title: 'Lead Follow-up',
    text: 'We have logged your request and our sales team will reach out within 24 hours.'
  },
  {
    title: 'Chat Wrap-up',
    text: 'Is there anything else I can help you with today before we wrap up?'
  },
  {
    title: 'Documentation Link',
    text: 'You can review our API documentation at https://docs.chatplatform.dev'
  }
];

export function ArchivesDetails({
  chat,
  isOpen,
  onToggle,
  activeTab,
  onTabChange
}: ArchivesDetailsProps) {
  const [notes, setNotes] = useState<Record<string, AgentNote[]>>(DEFAULT_NOTES);
  const [newNoteText, setNewNoteText] = useState('');
  const [cannedSearch, setCannedSearch] = useState('');

  if (!isOpen) {
    return null;
  }

  const currentNotes = notes[chat.id] || [];

  const handleAddNote = (e: FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const newNote: AgentNote = {
      id: 'note-' + Date.now(),
      author: chat.agent || 'Agent',
      text: newNoteText.trim(),
      createdAt: 'Just now'
    };

    setNotes((prev) => ({
      ...prev,
      [chat.id]: [newNote, ...(prev[chat.id] || [])]
    }));
    setNewNoteText('');
    toast.success('Note added successfully');
  };

  const filteredCanned = CANNED_RESPONSES.filter(
    (c) =>
      c.title.toLowerCase().includes(cannedSearch.toLowerCase()) ||
      c.text.toLowerCase().includes(cannedSearch.toLowerCase())
  );

  return (
    <div className='relative flex h-full w-full sm:w-[320px] md:w-[360px] shrink-0 flex-col border-l border-border/60 bg-card/50 overflow-hidden'>

      {/* Top Tab Bar & Utility Actions */}
      <div className='flex items-center justify-between border-b border-border/60 px-4 h-[56px] shrink-0 bg-background/50'>
        <div className='flex items-center gap-1'>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type='button'
                  aria-label='Customer Details'
                  onClick={() => onTabChange('info')}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-colors cursor-pointer',
                    activeTab === 'info'
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  )}
                />
              }
            >
              <Icons.user className='h-4 w-4' />
            </TooltipTrigger>
            <TooltipContent>Customer Details</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type='button'
                  aria-label='Notes & Canned Responses'
                  onClick={() => onTabChange('canned')}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-colors cursor-pointer',
                    activeTab === 'canned'
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  )}
                />
              }
            >
              <Icons.post className='h-4 w-4' />
            </TooltipTrigger>
            <TooltipContent>Notes & Canned Responses</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type='button'
                  aria-label='Apps & Integrations'
                  onClick={() => onTabChange('apps')}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-colors cursor-pointer',
                    activeTab === 'apps'
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  )}
                />
              }
            >
              <Icons.galleryVerticalEnd className='h-4 w-4' />
            </TooltipTrigger>
            <TooltipContent>Apps & Integrations</TooltipContent>
          </Tooltip>
        </div>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type='button'
                variant='ghost'
                size='icon-sm'
                onClick={onToggle}
                className='h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer'
                aria-label='Hide Details Panel'
              />
            }
          >
            <Icons.chevronRight className='h-4 w-4' />
          </TooltipTrigger>
          <TooltipContent side='left'>Hide Details Panel</TooltipContent>
        </Tooltip>
      </div>

      {/* Tab 1: Customer Details */}
      {activeTab === 'info' && (
        <div className='flex-1 overflow-y-auto p-4 space-y-5 text-xs divide-y divide-border/40'>
          {/* Section 1: General Info */}
          <div className='space-y-3 pt-1'>
            <div className='flex items-center justify-between'>
              <h4 className='text-xs font-semibold text-foreground tracking-tight'>General info</h4>
              <button type='button' className='text-muted-foreground hover:text-foreground'>
                <Icons.moreHorizontal className='h-4 w-4' />
              </button>
            </div>

            <div className='flex items-start gap-3'>
              <Avatar className='h-10 w-10 text-white text-sm font-semibold bg-purple-600 ring-2 ring-background'>
                <AvatarFallback className='bg-purple-600 text-white'>
                  {chat.customer.initials || 'T'}
                </AvatarFallback>
              </Avatar>

              <div className='space-y-0.5 overflow-hidden flex-1'>
                <div className='font-semibold text-foreground text-sm truncate'>
                  {chat.customer.name}
                </div>
                <button
                  type='button'
                  onClick={() => copyToClipboard(chat.customer.email, 'email')}
                  className='text-left text-muted-foreground hover:text-foreground hover:underline cursor-pointer truncate text-xs'
                >
                  {chat.customer.email}
                </button>
              </div>
            </div>

            <div className='space-y-1.5 pt-1 text-muted-foreground'>
              <div className='flex items-center gap-2'>
                <Icons.clock className='h-3.5 w-3.5 shrink-0' />
                <span>{chat.customer.localTime}</span>
              </div>
              <div className='flex items-center gap-2'>
                <Icons.mapPin className='h-3.5 w-3.5 shrink-0' />
                <span className='truncate'>{chat.customer.location}</span>
              </div>
            </div>

            <Button
              variant='outline'
              size='sm'
              className='w-full h-8 text-xs font-normal justify-center border-border/70 text-foreground/80 hover:text-foreground'
            >
              <span>View all chats ({chat.customer.allChatsCount})</span>
              <Icons.externalLink className='ml-1.5 h-3 w-3' />
            </Button>
          </div>

          {/* Section 2: Chat Info */}
          <div className='space-y-2.5 pt-4'>
            <h4 className='text-xs font-semibold text-foreground tracking-tight'>Chat info</h4>

            <div className='space-y-2 text-[11px]'>
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground'>Chat ID:</span>
                <button
                  type='button'
                  onClick={() => copyToClipboard(chat.chatInfo.chatId, 'Chat ID')}
                  className='font-mono font-medium text-foreground hover:underline'
                >
                  {chat.chatInfo.chatId}
                </button>
              </div>

              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground'>Chatting time:</span>
                <div className='flex items-center gap-1 font-medium text-foreground'>
                  <span>{chat.chatInfo.chattingTime}</span>
                  <Icons.info className='h-3 w-3 text-muted-foreground' />
                </div>
              </div>

              <div className='flex flex-col gap-0.5'>
                <span className='text-muted-foreground'>Started on:</span>
                <a
                  href={chat.chatInfo.startedUrl}
                  target='_blank'
                  rel='noreferrer'
                  className='text-blue-600 dark:text-blue-400 hover:underline truncate text-[11px]'
                >
                  {chat.chatInfo.startedUrl}
                </a>
              </div>

              <div className='flex items-center justify-between pt-1'>
                <span className='text-muted-foreground'>Groups:</span>
                <div className='flex items-center gap-1.5'>
                  <span className='flex h-4 w-4 items-center justify-center rounded bg-emerald-600 text-[10px] font-bold text-white'>
                    C
                  </span>
                  <span className='font-medium text-foreground'>{chat.chatInfo.group}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Pre-chat Form Data */}
          <div className='space-y-2.5 pt-4'>
            <h4 className='text-xs font-semibold text-foreground tracking-tight'>Pre-chat form</h4>

            <div className='space-y-1.5 rounded-lg border border-border/50 bg-background/60 p-3 text-[11px]'>
              {chat.preChatForm.name && (
                <div className='flex flex-col'>
                  <span className='text-muted-foreground font-medium'>Name:</span>
                  <span className='text-foreground'>{chat.preChatForm.name}</span>
                </div>
              )}
              {chat.preChatForm.email && (
                <div className='flex flex-col pt-1'>
                  <span className='text-muted-foreground font-medium'>E-mail:</span>
                  <span className='text-foreground break-all'>{chat.preChatForm.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Technology */}
          <div className='space-y-2.5 pt-4'>
            <h4 className='text-xs font-semibold text-foreground tracking-tight'>Technology</h4>

            <div className='space-y-1.5 text-[11px] text-muted-foreground'>
              <div className='flex items-center justify-between'>
                <span>IP address:</span>
                <span className='font-mono text-foreground'>{chat.technology.ipAddress}</span>
              </div>
              <div className='flex items-center justify-between'>
                <span>OS / Platform:</span>
                <span className='text-foreground'>{chat.technology.os}</span>
              </div>
              <div className='flex items-center justify-between'>
                <span>Browser:</span>
                <span className='text-foreground'>{chat.technology.browser}</span>
              </div>
              <div className='flex items-center justify-between'>
                <span>Device:</span>
                <span className='text-foreground'>{chat.technology.device}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Notes & Canned Responses */}
      {activeTab === 'canned' && (
        <div className='flex-1 overflow-y-auto p-4 space-y-5 text-xs'>
          {/* Internal Notes Section */}
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <h4 className='text-xs font-semibold text-foreground tracking-tight'>
                Internal Notes
              </h4>
              <Badge variant='secondary' className='text-[10px] h-4.5 px-1.5'>
                {currentNotes.length}
              </Badge>
            </div>

            <form onSubmit={handleAddNote} className='space-y-2'>
              <Textarea
                placeholder='Leave a private note about this chat or customer...'
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                className='min-h-[70px] text-xs resize-none'
              />
              <div className='flex justify-end'>
                <Button type='submit' size='sm' className='h-7 text-xs'>
                  <Icons.add className='mr-1 h-3 w-3' />
                  Add Note
                </Button>
              </div>
            </form>

            <div className='space-y-2 pt-1'>
              {currentNotes.length === 0 ? (
                <p className='text-muted-foreground italic text-[11px]'>No notes recorded yet.</p>
              ) : (
                currentNotes.map((note) => (
                  <div
                    key={note.id}
                    className='rounded-lg border border-border/50 bg-background/60 p-2.5 space-y-1'
                  >
                    <div className='flex items-center justify-between text-[10px] text-muted-foreground'>
                      <span className='font-medium text-foreground'>{note.author}</span>
                      <span>{note.createdAt}</span>
                    </div>
                    <p className='text-[11px] text-foreground/90'>{note.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <hr className='border-border/40' />

          {/* Canned Responses Section */}
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <h4 className='text-xs font-semibold text-foreground tracking-tight'>
                Canned Responses
              </h4>
            </div>

            <Input
              placeholder='Search canned responses...'
              value={cannedSearch}
              onChange={(e) => setCannedSearch(e.target.value)}
              className='h-8 text-xs'
            />

            <div className='space-y-2 pt-1'>
              {filteredCanned.map((canned, idx) => (
                <div
                  key={idx}
                  className='rounded-lg border border-border/50 bg-background/50 p-2.5 space-y-1.5 hover:bg-muted/40 transition-colors'
                >
                  <div className='flex items-center justify-between'>
                    <span className='font-semibold text-foreground text-[11px]'>
                      {canned.title}
                    </span>
                    <button
                      type='button'
                      onClick={() => copyToClipboard(canned.text, canned.title)}
                      className='text-muted-foreground hover:text-foreground text-[10px] flex items-center gap-1 font-medium'
                    >
                      <Icons.page className='h-3 w-3' />
                      Copy
                    </button>
                  </div>
                  <p className='text-[11px] text-muted-foreground line-clamp-2'>{canned.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Apps & Integrations */}
      {activeTab === 'apps' && (
        <div className='flex-1 overflow-y-auto p-4 space-y-4 text-xs'>
          <h4 className='text-xs font-semibold text-foreground tracking-tight'>Connected Apps</h4>

          {/* CRM Card */}
          <div className='rounded-xl border border-border/60 bg-background/70 p-3.5 space-y-2.5 shadow-2xs'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <span className='flex h-6 w-6 items-center justify-center rounded-md bg-orange-500/10 text-orange-600 font-bold text-xs'>
                  H
                </span>
                <span className='font-semibold text-foreground text-xs'>HubSpot CRM</span>
              </div>
              <Badge
                variant='outline'
                className='text-[10px] h-4.5 px-1.5 text-emerald-600 border-emerald-500/30'
              >
                Connected
              </Badge>
            </div>

            <div className='space-y-1.5 text-[11px] text-muted-foreground'>
              <div className='flex justify-between'>
                <span>Contact Stage:</span>
                <span className='font-medium text-foreground'>Qualified Opportunity</span>
              </div>
              <div className='flex justify-between'>
                <span>Owner:</span>
                <span className='font-medium text-foreground'>{chat.agent}</span>
              </div>
              <div className='flex justify-between'>
                <span>Deal Value:</span>
                <span className='font-medium text-foreground'>$3,200.00</span>
              </div>
            </div>
          </div>

          {/* Jira / Issue Tracker Card */}
          <div className='rounded-xl border border-border/60 bg-background/70 p-3.5 space-y-2.5 shadow-2xs'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <span className='flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 font-bold text-xs'>
                  J
                </span>
                <span className='font-semibold text-foreground text-xs'>Jira Software</span>
              </div>
              <Badge
                variant='outline'
                className='text-[10px] h-4.5 px-1.5 text-blue-600 border-blue-500/30'
              >
                Active
              </Badge>
            </div>

            <div className='space-y-1.5 text-[11px] text-muted-foreground'>
              <div className='flex justify-between'>
                <span>Ticket:</span>
                <span className='font-mono font-medium text-foreground'>#CHAT-1029</span>
              </div>
              <div className='flex justify-between'>
                <span>Summary:</span>
                <span className='font-medium text-foreground truncate max-w-[170px]'>
                  Widget session reconnect
                </span>
              </div>
              <div className='flex justify-between'>
                <span>Status:</span>
                <span className='font-medium text-emerald-600'>Resolved</span>
              </div>
            </div>
          </div>

          {/* Stripe Customer Card */}
          <div className='rounded-xl border border-border/60 bg-background/70 p-3.5 space-y-2.5 shadow-2xs'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <span className='flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600 font-bold text-xs'>
                  S
                </span>
                <span className='font-semibold text-foreground text-xs'>Stripe Billing</span>
              </div>
              <Badge
                variant='outline'
                className='text-[10px] h-4.5 px-1.5 text-indigo-600 border-indigo-500/30'
              >
                Customer
              </Badge>
            </div>

            <div className='space-y-1.5 text-[11px] text-muted-foreground'>
              <div className='flex justify-between'>
                <span>Plan:</span>
                <span className='font-medium text-foreground'>Business Tier (Monthly)</span>
              </div>
              <div className='flex justify-between'>
                <span>MRR:</span>
                <span className='font-medium text-foreground'>$89.00</span>
              </div>
              <div className='flex justify-between'>
                <span>Payment Status:</span>
                <span className='font-medium text-emerald-600'>Good Standing</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
