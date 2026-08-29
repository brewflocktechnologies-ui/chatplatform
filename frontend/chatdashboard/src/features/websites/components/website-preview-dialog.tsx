'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { getChatWidgetUrl } from '@/config/external-urls';
import { widgetConfigQueryOptions } from '@/features/widget-modifier/api/queries';
import { unwrapCdnConfig } from '@/features/widget-modifier/lib/federation';
import type { Website } from '../api/types';

interface WebsitePreviewDialogProps {
  website: Website;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function buildPreviewDocument(website: Website, cdnConfig: Record<string, unknown>): string {
  const hasConfig = Object.keys(cdnConfig).length > 0;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Widget Preview - ${website.domain}</title>
  <script>
    // Saved config from the MongoDB configs collection, inlined before the
    // widget script boots. The widget exposes ChatWidgetLit.injectStoreConfig.
    window.cutomizationConfig = ${JSON.stringify(cdnConfig)};

    function applyWidgetConfig() {
      if (window.cutomizationConfig && Object.keys(window.cutomizationConfig).length > 0 &&
          window.ChatWidgetLit && typeof window.ChatWidgetLit.injectStoreConfig === 'function') {
        window.ChatWidgetLit.injectStoreConfig(window.cutomizationConfig);
      }
    }

    document.addEventListener('DOMContentLoaded', applyWidgetConfig);
    window.addEventListener('load', applyWidgetConfig);

    var timer = setInterval(function () {
      if (window.ChatWidgetLit && typeof window.ChatWidgetLit.injectStoreConfig === 'function') {
        applyWidgetConfig();
        clearInterval(timer);
      }
    }, 50);
    setTimeout(function () { clearInterval(timer); }, 3000);
  <\/script>
  <script defer src="${getChatWidgetUrl()}"><\/script>
  <style>
    body {
      margin: 0;
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: #f8fafc;
      color: #0f172a;
      font-family: system-ui, sans-serif;
    }
  </style>
</head>
<body>
  <div style="text-align:center; padding:2rem; max-width:600px;">
    <h2 style="font-size:1.5rem; font-weight:700; margin-bottom:0.5rem;">${website.domain}</h2>
    <p style="opacity:0.7; font-size:0.875rem;">Live preview — ${hasConfig ? website.configName || website.flavour || 'linked config' : 'default config'}</p>
    ${hasConfig ? '' : '<p style="color:#ef4444; font-size:0.8rem;">No saved config linked to this website — assign one in the Widget Modifier.</p>'}
  </div>
</body>
</html>`;
}

export function WebsitePreviewDialog({ website, open, onOpenChange }: WebsitePreviewDialogProps) {
  // Fetch the website's linked config so the preview shows the SAVED widget
  // appearance rather than the bundle defaults.
  const { data: config, isLoading } = useQuery({
    ...widgetConfigQueryOptions(website.configId ?? ''),
    enabled: open && !!website.configId
  });

  const cdnConfig = config ? unwrapCdnConfig(config.cdnConfig) : {};
  const waitingForConfig = !!website.configId && isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex h-[85vh] flex-col gap-0 p-0 sm:max-w-5xl'>
        <DialogHeader className='border-b p-4'>
          <DialogTitle className='flex items-center gap-2 text-base'>
            Live Widget Preview: {website.domain}
            {(website.configName || website.flavour) && (
              <Badge variant='outline'>{website.configName || website.flavour}</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            The hosted chat widget rendered with this website&apos;s saved configuration.
          </DialogDescription>
        </DialogHeader>
        <div className='min-h-0 flex-1'>
          {waitingForConfig ? (
            <div className='flex h-full items-center justify-center gap-3'>
              <Icons.spinner className='text-primary h-5 w-5 animate-spin' />
              <span className='text-muted-foreground text-sm'>Loading saved config...</span>
            </div>
          ) : (
            open && (
              <iframe
                srcDoc={buildPreviewDocument(website, cdnConfig)}
                className='h-full w-full border-0'
                title='Widget Preview'
                sandbox='allow-scripts allow-same-origin'
              />
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
