'use client';

import { FormEvent, useRef } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FilePreview } from '@/components/ui/file-preview';
import type { Attachment } from '../utils/types';

interface MessageComposerProps {
  draft: string;
  onDraftChange: (text: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  contactName: string;
  quickReplies: string[];
  attachments: Attachment[];
  onAddAttachments: (files: FileList) => void;
  onRemoveAttachment: (id: string) => void;
}

export function MessageComposer({
  draft,
  onDraftChange,
  onSubmit,
  contactName,
  quickReplies,
  attachments,
  onAddAttachments,
  onRemoveAttachment
}: MessageComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <form
      onSubmit={onSubmit}
      className='border-t border-border/60 bg-background/50 px-4 py-3 shrink-0'
      aria-label='Reply composer'
    >
      <label htmlFor='messenger-editor' className='sr-only'>
        Write a message
      </label>

      {/* Precoded Quick Replies (Horizontal Scrolling Row) */}
      {quickReplies && quickReplies.length > 0 && (
        <div className='flex items-center gap-1.5 overflow-x-auto pb-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
          <span className='text-[10px] font-medium text-muted-foreground shrink-0 flex items-center gap-1 mr-0.5'>
            <Icons.sparkles className='h-3 w-3 text-primary' />
            Suggested:
          </span>
          {quickReplies.map((reply) => (
            <button
              key={reply}
              type='button'
              onClick={() => onDraftChange(reply)}
              className='shrink-0 rounded-full border border-border/70 bg-card hover:bg-muted/80 text-foreground/85 hover:text-foreground px-2.5 py-1 text-[11px] transition-colors shadow-2xs cursor-pointer'
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <FilePreview
          files={attachments.map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type
          }))}
          onRemove={onRemoveAttachment}
          className='mb-2 p-0'
        />
      )}

      {/* Unified Input Box */}
      <div className='flex items-center gap-2 rounded-2xl border border-border/70 bg-card/90 px-3 py-1.5 shadow-2xs focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 transition-all'>
        <input
          ref={fileInputRef}
          aria-label='Add attachments'
          type='file'
          multiple
          className='hidden'
          onChange={(e) => {
            if (e.target.files?.length) {
              onAddAttachments(e.target.files);
            }
            e.target.value = '';
          }}
        />

        <Button
          type='button'
          variant='ghost'
          size='icon-sm'
          className='h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 rounded-full cursor-pointer'
          aria-label='Attach a file'
          onClick={() => fileInputRef.current?.click()}
        >
          <Icons.paperclip className='h-4 w-4' />
        </Button>

        <Textarea
          id='messenger-editor'
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (draft.trim() || attachments.length > 0) {
                const form = e.currentTarget.closest('form');
                form?.requestSubmit();
              }
            }
          }}
          placeholder={`Message ${contactName}...`}
          rows={1}
          required={attachments.length === 0}
          className='text-foreground placeholder:text-muted-foreground/70 min-h-[36px] max-h-[120px] w-full resize-none border-none bg-transparent py-2 text-xs sm:text-sm focus-visible:ring-0 focus-visible:outline-none flex-1 leading-relaxed'
          aria-label={'Message ' + contactName}
        />

        <Button
          type='submit'
          size='icon-sm'
          className='h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center'
          disabled={!draft.trim() && attachments.length === 0}
          aria-label='Send message'
        >
          <Icons.send className='h-3.5 w-3.5' aria-hidden='true' />
        </Button>
      </div>
    </form>
  );
}
