'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { buildEmbedCode } from '@/config/external-urls';
import type { Website } from '../api/types';

const STEPS = [
  {
    label: 'Get the code',
    description: 'Copy the snippet below — it renders the chat widget on your page.'
  },
  {
    label: 'Find .html file',
    description:
      'Open the main .html file of your website (usually index.html) with any text editor.'
  },
  {
    label: 'Paste the code',
    description:
      'Paste the snippet between the <head> tags — right after the opening <head> or before the closing </head>. For performance-sensitive pages, place it at the end of <body> instead.'
  },
  {
    label: 'Done',
    description:
      'Save and publish the page. The widget appears after reloading the page — start chatting with your visitors!'
  }
];

interface WebsiteCodeDialogProps {
  website: Website;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WebsiteCodeDialog({ website, open, onOpenChange }: WebsiteCodeDialogProps) {
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);

  const embedCode = buildEmbedCode(website.id);

  useEffect(() => {
    if (!open) {
      setStep(0);
      setCopied(false);
    }
  }, [open]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Install the chat widget</DialogTitle>
          <DialogDescription>
            Add the chat widget to {website.domain} by embedding this script in the HTML source of
            one or more pages.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className='flex items-center justify-center gap-1 overflow-x-auto py-2'>
          {STEPS.map((s, idx) => {
            const isCompleted = idx < step;
            const isActive = idx === step;
            return (
              <div key={s.label} className='flex items-center'>
                <button
                  type='button'
                  onClick={() => setStep(idx)}
                  aria-current={isActive ? 'step' : undefined}
                  className={cn(
                    'flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-xs font-semibold transition-colors',
                    isCompleted && 'bg-primary text-primary-foreground',
                    isActive && 'bg-primary text-primary-foreground ring-primary/40 ring-2',
                    !isCompleted && !isActive && 'bg-muted text-muted-foreground hover:bg-accent'
                  )}
                >
                  {isCompleted ? <Icons.check className='h-4 w-4' /> : idx + 1}
                </button>
                <button
                  type='button'
                  onClick={() => setStep(idx)}
                  className={cn(
                    'mx-2 cursor-pointer text-xs font-medium whitespace-nowrap',
                    isActive ? 'text-foreground font-semibold' : 'text-muted-foreground'
                  )}
                >
                  {s.label}
                </button>
                {idx < STEPS.length - 1 && <span className='bg-border h-px w-6 shrink-0' />}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className='bg-muted/40 min-h-28 rounded-lg border p-4'>
          <p className='text-sm'>{STEPS[step].description}</p>
          {step === 0 && (
            <div className='bg-background mt-3 flex items-start gap-2 rounded-md border p-3'>
              <pre className='flex-1 overflow-x-auto font-mono text-xs whitespace-pre-wrap'>
                {embedCode}
              </pre>
              <Button type='button' variant='outline' size='sm' onClick={handleCopy}>
                {copied ? (
                  <Icons.check className='mr-1 h-3.5 w-3.5' />
                ) : (
                  <Icons.post className='mr-1 h-3.5 w-3.5' />
                )}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className='flex-row justify-between sm:justify-between'>
          <Button
            type='button'
            variant='outline'
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
          >
            <Icons.chevronLeft className='mr-1 h-4 w-4' /> Previous
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type='button' onClick={() => setStep(step + 1)}>
              Next <Icons.chevronRight className='ml-1 h-4 w-4' />
            </Button>
          ) : (
            <Button type='button' onClick={() => onOpenChange(false)}>
              Finish
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
