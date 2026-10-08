'use client';

import { useState, type FormEvent } from 'react';
import type { Conversation, DetailsTab, ChatNote } from '../utils/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function copyToClipboard(text: string, label: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard`);
  }
}

interface ChatDetailsProps {
  conversation: Conversation;
  isOpen: boolean;
  onToggle: () => void;
  activeTab: DetailsTab;
  onTabChange: (tab: DetailsTab) => void;
  onInsertCanned?: (text: string) => void;
}

const DEFAULT_NOTES: Record<string, ChatNote[]> = {
  default: [
    {
      id: 'note-1',
      author: 'Support Agent',
      text: 'Visitor initiated conversation from pricing page inquiry. Interested in multi-agent routing.',
      createdAt: '10 mins ago'
    }
  ]
};

const CANNED_RESPONSES = [
  {
    title: 'Greeting & Welcome',
    text: 'Hello! Thanks for reaching out to support. How can I help you today?'
  },
  {
    title: 'Request Account Details',
    text: 'Could you please provide your registered email address or organization ID so I can look up your account?'
  },
  {
    title: 'Checking with Engineering',
    text: 'Let me consult our engineering team regarding this issue. I will update you here in a moment.'
  },
  {
    title: 'Documentation Guide',
    text: 'You can find step-by-step guides and documentation at https://docs.chatplatform.dev'
  },
  {
    title: 'Resolution & Wrap-up',
    text: 'Is there anything else I can assist you with before we wrap up today?'
  }
];

export function ChatDetails({
  conversation,
  isOpen,
  onToggle,
  activeTab,
  onTabChange,
  onInsertCanned
}: ChatDetailsProps) {
  const [notes, setNotes] = useState<Record<string, ChatNote[]>>(DEFAULT_NOTES);
  const [newNoteText, setNewNoteText] = useState('');
  const [cannedSearch, setCannedSearch] = useState('');

  if (!isOpen) {
    return null;
  }

  const currentNotes = notes[conversation.id] || notes.default || [];

  // Generate sensible defaults for visitor attributes if not explicitly provided
  const email =
    conversation.visitorInfo?.email ||
    `${conversation.name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '')}@visitor.com`;
  const location = conversation.visitorInfo?.location || 'San Francisco, United States';
  const localTime =
    conversation.visitorInfo?.localTime ||
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
  const ipAddress = conversation.visitorInfo?.ipAddress || '198.51.100.42';
  const os = conversation.visitorInfo?.os || 'macOS / Chrome 122';
  const browser = conversation.visitorInfo?.browser || 'Chrome 122.0.6261';
  const device = conversation.visitorInfo?.device || 'Desktop (1920x1080)';
  const startedUrl = conversation.visitorInfo?.startedUrl || 'https://chatplatform.dev/pricing';
  const chattingTime = conversation.visitorInfo?.chattingTime || '4m 12s';

  const handleAddNote = (e: FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const newNote: ChatNote = {
      id: 'note-' + Date.now(),
      author: 'You',
      text: newNoteText.trim(),
      createdAt: 'Just now'
    };

    setNotes((prev) => ({
      ...prev,
      [conversation.id]: [newNote, ...(prev[conversation.id] || [])]
    }));
    setNewNoteText('');
    toast.success('Private note added');
  };

  const handleInsert = (text: string) => {
    if (onInsertCanned) {
      onInsertCanned(text);
      toast.success('Inserted into composer');
    } else {
      copyToClipboard(text, 'response');
    }
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
                  aria-label='Visitor Details'
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
            <TooltipContent>Visitor Details</TooltipContent>
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

      {/* Tab 1: Visitor Details */}
      {activeTab === 'info' && (
        <div className='flex-1 overflow-y-auto p-4 space-y-5 text-xs divide-y divide-border/40'>
          {/* Section 1: General Info */}
          <div className='space-y-3 pt-1'>
            <div className='flex items-center justify-between'>
              <h4 className='text-xs font-semibold text-foreground tracking-tight'>General info</h4>
              <span className='inline-flex items-center gap-1 text-[11px] font-medium'>
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    conversation.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/50'
                  )}
                />
                <span className='capitalize text-muted-foreground'>{conversation.status}</span>
              </span>
            </div>

            <div className='flex items-start gap-3'>
              <Avatar className='h-10 w-10 text-white text-sm font-semibold bg-primary/20 ring-2 ring-background'>
                <AvatarFallback className='bg-primary/20 text-primary font-bold'>
                  {conversation.initials}
                </AvatarFallback>
              </Avatar>

              <div className='space-y-0.5 overflow-hidden flex-1'>
                <div className='font-semibold text-foreground text-sm truncate'>
                  {conversation.name}
                </div>
                <button
                  type='button'
                  onClick={() => copyToClipboard(email, 'email')}
                  className='text-left text-muted-foreground hover:text-foreground hover:underline cursor-pointer truncate text-xs block'
                >
                  {email}
                </button>
              </div>
            </div>

            <div className='space-y-1.5 pt-1 text-muted-foreground'>
              <div className='flex items-center gap-2'>
                <Icons.clock className='h-3.5 w-3.5 shrink-0' />
                <span>{localTime}</span>
              </div>
              <div className='flex items-center gap-2'>
                <Icons.mapPin className='h-3.5 w-3.5 shrink-0' />
                <span className='truncate'>{location}</span>
              </div>
            </div>

            <Button
              variant='outline'
              size='sm'
              className='w-full h-8 text-xs font-normal justify-center border-border/70 text-foreground/80 hover:text-foreground'
              onClick={() => toast.info('Loading past history for this visitor')}
            >
              <span>View all past sessions</span>
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
                  onClick={() => copyToClipboard(conversation.id, 'Chat ID')}
                  className='font-mono font-medium text-foreground hover:underline cursor-pointer'
                >
                  {conversation.id}
                </button>
              </div>

              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground'>Active duration:</span>
                <div className='flex items-center gap-1 font-medium text-foreground'>
                  <span>{chattingTime}</span>
                  <Icons.info className='h-3 w-3 text-muted-foreground' />
                </div>
              </div>

              <div className='flex flex-col gap-0.5'>
                <span className='text-muted-foreground'>Current page:</span>
                <a
                  href={startedUrl}
                  target='_blank'
                  rel='noreferrer'
                  className='text-blue-600 dark:text-blue-400 hover:underline truncate text-[11px]'
                >
                  {startedUrl}
                </a>
              </div>

              <div className='flex items-center justify-between pt-1'>
                <span className='text-muted-foreground'>Routing queue:</span>
                <div className='flex items-center gap-1.5'>
                  <span className='flex h-4 w-4 items-center justify-center rounded bg-emerald-600 text-[10px] font-bold text-white'>
                    L
                  </span>
                  <span className='font-medium text-foreground'>Live Support</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Technology Specs */}
          <div className='space-y-2.5 pt-4'>
            <h4 className='text-xs font-semibold text-foreground tracking-tight'>Technology</h4>

            <div className='space-y-1.5 text-[11px] text-muted-foreground'>
              <div className='flex items-center justify-between'>
                <span>IP address:</span>
                <span className='font-mono text-foreground'>{ipAddress}</span>
              </div>
              <div className='flex items-center justify-between'>
                <span>OS / Platform:</span>
                <span className='text-foreground'>{os}</span>
              </div>
              <div className='flex items-center justify-between'>
                <span>Browser:</span>
                <span className='text-foreground'>{browser}</span>
              </div>
              <div className='flex items-center justify-between'>
                <span>Device:</span>
                <span className='text-foreground'>{device}</span>
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
                placeholder='Leave a private note about this chat...'
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
                    <div className='flex items-center gap-1.5'>
                      <button
                        type='button'
                        onClick={() => handleInsert(canned.text)}
                        className='text-blue-600 dark:text-blue-400 hover:underline text-[10px] flex items-center gap-0.5 font-medium cursor-pointer'
                        title='Insert into composer'
                      >
                        <Icons.send className='h-2.5 w-2.5' />
                        Insert
                      </button>
                      <span className='text-border'>•</span>
                      <button
                        type='button'
                        onClick={() => copyToClipboard(canned.text, canned.title)}
                        className='text-muted-foreground hover:text-foreground text-[10px] flex items-center gap-1 font-medium cursor-pointer'
                      >
                        <Icons.page className='h-3 w-3' />
                        Copy
                      </button>
                    </div>
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
                Sync Active
              </Badge>
            </div>

            <div className='space-y-1.5 text-[11px] text-muted-foreground'>
              <div className='flex justify-between'>
                <span>Contact Stage:</span>
                <span className='font-medium text-foreground'>Active Lead</span>
              </div>
              <div className='flex justify-between'>
                <span>Assigned Agent:</span>
                <span className='font-medium text-foreground'>You</span>
              </div>
              <div className='flex justify-between'>
                <span>Pipeline Value:</span>
                <span className='font-medium text-foreground'>$4,800.00</span>
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
                <span className='font-semibold text-foreground text-xs'>Jira Service Desk</span>
              </div>
              <Badge
                variant='outline'
                className='text-[10px] h-4.5 px-1.5 text-blue-600 border-blue-500/30'
              >
                Linked
              </Badge>
            </div>

            <div className='space-y-1.5 text-[11px] text-muted-foreground'>
              <div className='flex justify-between'>
                <span>Ticket:</span>
                <span className='font-mono font-medium text-foreground'>#CHAT-2041</span>
              </div>
              <div className='flex justify-between'>
                <span>Priority:</span>
                <span className='font-medium text-amber-600'>Medium</span>
              </div>
              <div className='flex justify-between'>
                <span>Status:</span>
                <span className='font-medium text-emerald-600'>In Progress</span>
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
                Pro Tier
              </Badge>
            </div>

            <div className='space-y-1.5 text-[11px] text-muted-foreground'>
              <div className='flex justify-between'>
                <span>Plan:</span>
                <span className='font-medium text-foreground'>Pro Annual</span>
              </div>
              <div className='flex justify-between'>
                <span>MRR:</span>
                <span className='font-medium text-foreground'>$129.00</span>
              </div>
              <div className='flex justify-between'>
                <span>Billing Status:</span>
                <span className='font-medium text-emerald-600'>Active</span>
              </div>
            </div>
          </div>

          {/* Operator Actions */}
          <div className='space-y-2 pt-2 border-t border-border/40'>
            <h4 className='text-xs font-semibold text-foreground tracking-tight'>Quick Actions</h4>
            <div className='grid grid-cols-2 gap-2'>
              <Button
                variant='outline'
                size='sm'
                className='h-7 text-[11px] border-border/60 text-muted-foreground hover:text-foreground'
                onClick={() => toast.success('Transcript exported to email')}
              >
                <Icons.page className='mr-1 h-3 w-3' />
                Export
              </Button>
              <Button
                variant='outline'
                size='sm'
                className='h-7 text-[11px] border-border/60 text-muted-foreground hover:text-foreground'
                onClick={() => toast.info('Transfer modal opened')}
              >
                <Icons.share className='mr-1 h-3 w-3' />
                Transfer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
