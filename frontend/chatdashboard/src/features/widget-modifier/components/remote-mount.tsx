'use client';

import { useEffect, useRef } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  getActiveWidgetEnv,
  getWidgetCustomizationMfeUrl,
  setActiveWidgetEnv
} from '@/config/external-urls';
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
    const currentEnv = getActiveWidgetEnv();
    const otherEnv = currentEnv === 'local' ? 'prod' : 'local';

    return (
      <div className='flex h-full items-center justify-center p-8'>
        <div className='border-destructive/40 bg-destructive/5 max-w-md rounded-lg border p-4 text-center'>
          <p className='text-destructive text-sm font-medium'>
            Couldn&apos;t load customization UI ({currentEnv === 'local' ? 'Local: port 5001' : 'Production CDN'})
          </p>
          <p className='text-muted-foreground mt-1 text-xs'>
            {error.message}
          </p>
          <div className='mt-4 flex items-center justify-center gap-2'>
            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                setActiveWidgetEnv(otherEnv);
                window.location.reload();
              }}
            >
              Switch to {otherEnv === 'prod' ? 'Production CDN' : 'Local (port 5001)'}
            </Button>
            <Button
              size='sm'
              variant='ghost'
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
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
