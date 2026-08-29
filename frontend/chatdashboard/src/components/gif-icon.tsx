'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { IconUsers, type IconProps } from '@tabler/icons-react';

type StaticIcon = React.ComponentType<IconProps>;

// Animated GIF icon (from public/gif-icons). Shows a static theme-colored
// tabler icon at rest; while the enclosing menu button / link is hovered it
// plays the GIF instead — remounted on each hover so the animation restarts
// from the first frame. The GIF is normalized to the theme with filters:
// silhouetted black in light mode, inverted to white in dark mode.
function createGifIcon(src: string, Static: StaticIcon) {
  return function GifIcon({ className, ...props }: IconProps) {
    const ref = React.useRef<HTMLSpanElement>(null);
    const [hovered, setHovered] = React.useState(false);

    React.useEffect(() => {
      const el = ref.current;
      if (!el) return;
      // Hover on the whole clickable row, not just the icon.
      const host = el.closest('a, button, [data-sidebar="menu-button"]') ?? el;
      const on = () => setHovered(true);
      const off = () => setHovered(false);
      host.addEventListener('mouseenter', on);
      host.addEventListener('mouseleave', off);
      return () => {
        host.removeEventListener('mouseenter', on);
        host.removeEventListener('mouseleave', off);
      };
    }, []);

    return (
      <span ref={ref} className={cn('relative inline-flex size-4 shrink-0', className)}>
        <Static className={cn('size-4', hovered && 'opacity-0')} {...props} />
        {hovered && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=''
            aria-hidden='true'
            className='absolute inset-0 size-4 object-contain brightness-0 grayscale dark:invert'
          />
        )}
      </span>
    );
  };
}

// Ready-made icon components (client components must be exported as
// components, never as factory calls from server modules).
export const TeamIconGif = createGifIcon('/gif-icons/Team-Icon.gif', IconUsers);
