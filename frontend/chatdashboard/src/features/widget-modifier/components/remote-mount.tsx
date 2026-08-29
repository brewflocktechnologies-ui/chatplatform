'use client';

import { useEffect, useRef } from 'react';
import { Icons } from '@/components/icons';
import { getWidgetCustomizationMfeUrl } from '@/config/external-urls';
import { useViteRemote } from '../lib/federation';

interface RemoteMountProps {
  websiteId: string;
  customerId: string;
  domain: string;
}

// Mounts the federated customization UI (exposed as ./mount) into a div.
export function RemoteMount({ websiteId, customerId, domain }: RemoteMountProps) {
  const { mod, error } = useViteRemote(getWidgetCustomizationMfeUrl(), './mount');
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!mod || !el) return;
    delete el.dataset.cwMounted;

    Promise.resolve(mod.mount(el, { websiteId, customerId, domain })).catch((e) =>
      console.error('Failed to mount customization widget:', e)
    );

    return () => {
      try {
        mod.unmount?.(el);
      } catch {
        // already unmounted
      }
    };
  }, [mod, websiteId, customerId, domain]);

  if (error) {
    return (
      <div className='flex h-full items-center justify-center p-8'>
        <div className='border-destructive/40 bg-destructive/5 max-w-md rounded-lg border p-4 text-center'>
          <p className='text-destructive text-sm font-medium'>
            Couldn&apos;t load the customization UI
          </p>
          <p className='text-muted-foreground mt-1 text-xs'>
            {error.message} — make sure the chatwidget-customization app is running (locally:
            npm run preview on port 5001).
          </p>
        </div>
      </div>
    );
  }

  if (!mod) {
    return (
      <div className='flex h-full items-center justify-center gap-3'>
        <Icons.spinner className='text-primary h-6 w-6 animate-spin' />
        <span className='text-muted-foreground text-sm font-medium'>
          Loading customization UI...
        </span>
      </div>
    );
  }

  return <div ref={containerRef} className='h-full w-full overflow-hidden' />;
}
