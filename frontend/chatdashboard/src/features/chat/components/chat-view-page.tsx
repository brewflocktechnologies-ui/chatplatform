'use client';

import { Messenger } from './messenger';

export default function ChatViewPage() {
  return (
    <div className='flex h-[calc(100dvh-4rem)] w-full overflow-hidden border-t border-border/60 bg-background'>
      <Messenger />
    </div>
  );
}
