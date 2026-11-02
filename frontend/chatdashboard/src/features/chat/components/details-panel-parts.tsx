'use client';

import type { ComponentType, ReactNode, SyntheticEvent } from 'react';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ChatNote, DetailsTab } from '../utils/types';

const ChevronRightIcon = Icons.chevronRight;
const AddIcon = Icons.add;

interface DetailsTabBarProps {
  /** Label of the first tab: "Customer Details" in archives, "Visitor Details" in live chat. */
  readonly infoLabel: string;
  readonly activeTab: DetailsTab;
  readonly onTabChange: (tab: DetailsTab) => void;
  readonly onToggle: () => void;
}

// Top bar of the details panel: the three tab icons and the "hide panel" button.
export function DetailsTabBar({
  infoLabel,
  activeTab,
  onTabChange,
  onToggle
}: Readonly<DetailsTabBarProps>) {
  const tabs: ReadonlyArray<{
    tab: DetailsTab;
    label: string;
    icon: ComponentType<{ className?: string }>;
  }> = [
    { tab: 'info', label: infoLabel, icon: Icons.user },
    { tab: 'canned', label: 'Notes & Canned Responses', icon: Icons.post },
    { tab: 'apps', label: 'Apps & Integrations', icon: Icons.galleryVerticalEnd }
  ];

  return (
    <div className='flex items-center justify-between border-b border-border/60 px-4 h-[56px] shrink-0 bg-background/50'>
      <div className='flex items-center gap-1'>
        {tabs.map(({ tab, label, icon: Icon }) => (
          <Tooltip key={tab}>
            <TooltipTrigger
              render={
                <button
                  type='button'
                  aria-label={label}
                  onClick={() => onTabChange(tab)}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-colors cursor-pointer',
                    activeTab === tab
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  )}
                />
              }
            >
              <Icon className='h-4 w-4' />
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        ))}
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
          <ChevronRightIcon className='h-4 w-4' />
        </TooltipTrigger>
        <TooltipContent side='left'>Hide Details Panel</TooltipContent>
      </Tooltip>
    </div>
  );
}

interface NotesSectionProps {
  readonly notes: readonly ChatNote[];
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void;
  readonly placeholder: string;
}

// "Internal Notes": a count badge, the add-note form and the list of notes.
export function NotesSection({
  notes,
  value,
  onValueChange,
  onSubmit,
  placeholder
}: Readonly<NotesSectionProps>) {
  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <h4 className='text-xs font-semibold text-foreground tracking-tight'>Internal Notes</h4>
        <Badge variant='secondary' className='text-[10px] h-4.5 px-1.5'>
          {notes.length}
        </Badge>
      </div>

      <form onSubmit={onSubmit} className='space-y-2'>
        <Textarea
          placeholder={placeholder}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          className='min-h-[70px] text-xs resize-none'
        />
        <div className='flex justify-end'>
          <Button type='submit' size='sm' className='h-7 text-xs'>
            <AddIcon className='mr-1 h-3 w-3' />
            Add Note
          </Button>
        </div>
      </form>

      <div className='space-y-2 pt-1'>
        {notes.length === 0 ? (
          <p className='text-muted-foreground italic text-[11px]'>No notes recorded yet.</p>
        ) : (
          notes.map((note) => (
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
  );
}

interface CannedSectionProps {
  readonly responses: ReadonlyArray<{ title: string; text: string }>;
  readonly search: string;
  readonly onSearchChange: (value: string) => void;
  /** The buttons shown next to a response's title (Copy, and Insert in live chat). */
  readonly renderActions: (response: { title: string; text: string }) => ReactNode;
}

// "Canned Responses": a search box and the matching responses.
export function CannedSection({
  responses,
  search,
  onSearchChange,
  renderActions
}: Readonly<CannedSectionProps>) {
  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <h4 className='text-xs font-semibold text-foreground tracking-tight'>Canned Responses</h4>
      </div>

      <Input
        placeholder='Search canned responses...'
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className='h-8 text-xs'
      />

      <div className='space-y-2 pt-1'>
        {responses.map((canned) => (
          <div
            key={canned.title}
            className='rounded-lg border border-border/50 bg-background/50 p-2.5 space-y-1.5 hover:bg-muted/40 transition-colors'
          >
            <div className='flex items-center justify-between'>
              <span className='font-semibold text-foreground text-[11px]'>{canned.title}</span>
              {renderActions(canned)}
            </div>
            <p className='text-[11px] text-muted-foreground line-clamp-2'>{canned.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
