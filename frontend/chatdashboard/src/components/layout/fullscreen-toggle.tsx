'use client';

import * as React from 'react';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

function toggleFullscreen() {
  if (document.fullscreenElement) {
    void document.exitFullscreen();
  } else {
    void document.documentElement.requestFullscreen();
  }
}

export function FullscreenToggle() {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button variant='secondary' size='icon' className='size-8' onClick={toggleFullscreen} />
        }
      >
        {isFullscreen ? <Icons.minimize /> : <Icons.maximize />}
        <span className='sr-only'>{isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}</span>
      </TooltipTrigger>
      <TooltipContent>{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</TooltipContent>
    </Tooltip>
  );
}
