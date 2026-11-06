'use client';

import type { ComponentType } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { DetailsTab } from '../utils/types';

const ChevronLeftIcon = Icons.chevronLeft;

interface DetailsRailProps {
  /** Label of the first tab: "Customer Details" in archives, "Visitor Details" in live chat. */
  readonly infoLabel: string;
  /** Reopens the details panel, optionally on a specific tab. */
  readonly onOpen: (tab?: DetailsTab) => void;
}

// The narrow rail shown instead of the details panel while it is collapsed.
export function DetailsRail({ infoLabel, onOpen }: Readonly<DetailsRailProps>) {
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
    <div className='flex h-full w-10 flex-col items-center border-l border-border/60 bg-card/40 shrink-0'>
      <div className='flex h-[56px] w-full items-center justify-center border-b border-border/60 shrink-0'>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type='button'
                variant='ghost'
                size='icon-sm'
                onClick={() => onOpen()}
                className='h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer'
                aria-label='Open Details Panel'
              />
            }
          >
            <ChevronLeftIcon className='h-4 w-4' />
          </TooltipTrigger>
          <TooltipContent side='left'>Open Details Panel</TooltipContent>
        </Tooltip>
      </div>

      <div className='mt-3 flex flex-col gap-2'>
        {tabs.map(({ tab, label, icon: Icon }) => (
          <Tooltip key={tab}>
            <TooltipTrigger
              render={
                <button
                  type='button'
                  aria-label={label}
                  onClick={() => onOpen(tab)}
                  className='flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors cursor-pointer'
                />
              }
            >
              <Icon className='h-3.5 w-3.5' />
            </TooltipTrigger>
            <TooltipContent side='left'>{label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
