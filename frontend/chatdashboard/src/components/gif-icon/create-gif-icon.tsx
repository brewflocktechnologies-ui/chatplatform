'use client';

import { cn } from '@/lib/utils';
import { useHoverTarget } from '@/hooks/use-hover-target';
import type { IconProps } from '@tabler/icons-react';
import { IconImage } from './icon-image';

const HOVER_HOST_SELECTOR = 'a, button, [data-sidebar="menu-button"]';

/**
 * Builds an icon component that shows a static SVG at rest and swaps to an
 * animated GIF (restarted on every hover) when the surrounding sidebar
 * button/link is hovered.
 */
export function createGifIcon(gifSrc: string, staticSrc: string) {
  return function GifIcon({ className, ...props }: IconProps) {
    const { ref, hovered } = useHoverTarget<HTMLSpanElement>(
      HOVER_HOST_SELECTOR,
    );

    return (
      <span
        ref={ref}
        className={cn('relative inline-flex size-4 shrink-0', className)}
      >
        <IconImage
          src={staticSrc}
          {...props}
          className={cn(hovered && 'opacity-0')}
        />

        {hovered && (
          <IconImage
            src={gifSrc}
            {...props}
            className="absolute inset-0 brightness-0 grayscale dark:invert"
          />
        )}
      </span>
    );
  };
}
