'use client';

import { Icons } from '@/components/icons';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';
import { FilePreview } from '@/components/ui/file-preview';
import type { Message } from '../utils/types';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const shouldReduceMotion = useReducedMotion();
  const isUser = message.sender === 'user';

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8, scale: 0.98 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}
      role='group'
      aria-label={message.author + ' at ' + message.timestamp}
    >
      <div
        className={cn(
          'relative max-w-[80%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 sm:px-4 sm:py-2.5 leading-relaxed shadow-2xs transition-all',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-xs'
            : 'bg-muted/80 text-foreground border border-border/40 rounded-tl-xs'
        )}
      >
        {!isUser && (
          <p className='text-[10px] font-semibold text-muted-foreground mb-0.5 tracking-tight'>
            {message.author}
          </p>
        )}

        {message.text && (
          <p className='text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap break-words'>
            {message.text}
          </p>
        )}

        {message.attachments && message.attachments.length > 0 && (
          <FilePreview
            files={message.attachments.map((a) => ({
              id: a.id,
              name: a.name,
              type: a.type
            }))}
            variant={isUser ? 'inverted' : 'default'}
            className='mt-1.5 p-0'
          />
        )}

        <div
          className={cn(
            'mt-1 flex items-center justify-end gap-1 text-[10px]',
            isUser ? 'text-primary-foreground/75' : 'text-muted-foreground'
          )}
        >
          <span>{message.timestamp}</span>
          {isUser && (
            <Icons.checks
              className='text-primary-foreground/80 h-3 w-3 shrink-0'
              aria-hidden='true'
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}
