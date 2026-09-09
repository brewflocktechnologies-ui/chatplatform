'use client';

import dynamic from 'next/dynamic';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';

// The notifications popover (store, card list, ScrollArea) has no role in
// first paint — load it as a low-priority async chunk instead of shipping it
// in the eager dashboard shell. The fallback matches the trigger's footprint
// so hydration doesn't cause a layout shift.
const NotificationCenter = dynamic(
  () =>
    import('@/features/notifications/components/notification-center').then(
      (m) => m.NotificationCenter
    ),
  {
    ssr: false,
    loading: () => (
      <Button variant='ghost' size='icon' className='relative h-8 w-8'>
        <Icons.notification className='h-4 w-4' />
        <span className='sr-only'>Notifications</span>
      </Button>
    )
  }
);

export function LazyNotificationCenter() {
  return <NotificationCenter />;
}