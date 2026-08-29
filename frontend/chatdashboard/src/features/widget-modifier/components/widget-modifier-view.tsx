'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseAsString, useQueryStates } from 'nuqs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertModal } from '@/components/modal/alert-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingButton } from '@/components/ui/loading-button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { customersQueryOptions } from '@/features/customers/api/queries';
import { websitesQueryOptions } from '@/features/websites/api/queries';
import { widgetConfigsQueryOptions, widgetConfigKeys } from '../api/queries';
import {
  createWidgetConfig,
  deleteWidgetConfig,
  renameWidgetConfig,
  saveWidgetConfigCdn
} from '../api/service';
import type { WidgetConfig } from '../api/types';
import { postToWidgetFrame, stableStringify, unwrapCdnConfig } from '../lib/federation';
import { RemoteMount } from './remote-mount';

function handleRefresh() {
  postToWidgetFrame('RESET_WIDGET_PREVIEW');
  toast.info('Widget preview refreshed');
}

export function WidgetModifierView() {
  const queryClient = useQueryClient();

  // Deep-linkable selection state (the Websites table links here).
  const [params, setParams] = useQueryStates({
    customerId: parseAsString,
    websiteId: parseAsString,
    configId: parseAsString
  });

  const { data: customersData } = useQuery(customersQueryOptions({ page: 1, limit: 100 }));
  const customers = useMemo(() => customersData?.customers ?? [], [customersData]);

  const { data: websitesData, isLoading: loadingWebsites } = useQuery({
    ...websitesQueryOptions({ page: 1, limit: 100, customerId: params.customerId ?? undefined }),
    enabled: !!params.customerId
  });
  const websites = useMemo(() => websitesData?.websites ?? [], [websitesData]);

  const { data: configsData } = useQuery(widgetConfigsQueryOptions());
  const configs = useMemo(() => configsData?.configs ?? [], [configsData]);

  const selectedWebsite = websites.find((w) => w.id === params.websiteId) ?? null;
  const selectedConfig = configs.find((c) => c.id === params.configId) ?? null;

  // Default the website to the customer's first one, and the config to the
  // website's linked config, unless the URL already pins them.
  useEffect(() => {
    if (params.customerId && !params.websiteId && websites.length > 0) {
      void setParams({ websiteId: websites[0].id });
    }
  }, [params.customerId, params.websiteId, websites, setParams]);

  useEffect(() => {
    if (selectedWebsite?.configId && !params.configId) {
      void setParams({ configId: selectedWebsite.configId });
    }
  }, [selectedWebsite, params.configId, setParams]);

  // Dirty tracking: the MFE emits WIDGET_CONFIG_CHANGED only on real user
  // input (its hydration guard suppresses load-triggered events). Each report
  // is compared against the loaded config with an order-insensitive stringify,
  // tagged with the config id so stale reports never mark a new config dirty.
  const [mfeState, setMfeState] = useState<{ configId: string | null; dirty: boolean } | null>(
    null
  );

  const isDirty = !!mfeState && !!selectedConfig && mfeState.configId === selectedConfig.id
    ? mfeState.dirty
    : false;

  // Latest values for the postMessage handler (written in an effect, read in
  // event handlers only).
  const latestRef = useRef<{
    config: WidgetConfig | null;
    baseline: string | null;
    domain?: string;
    save: (vars: { id: string; cdnConfig: Record<string, unknown> }) => void;
  }>({ config: null, baseline: null, save: () => {} });

  // Change reports that were already queued when a config push happens (e.g.
  // the input blur fired by clicking Undo) must not re-mark the fresh load as
  // dirty — mute reports briefly after each push.
  const muteChangedUntilRef = useRef(0);

  const pushConfigToFrame = useCallback((config: WidgetConfig | null, domain?: string) => {
    const cdn = config ? unwrapCdnConfig(config.cdnConfig) : {};
    muteChangedUntilRef.current = Date.now() + 500;
    postToWidgetFrame('LOAD_WIDGET_CONFIG', { cdnConfig: cdn, domain });
    if (domain) postToWidgetFrame('UPDATE_PREVIEW_DOMAIN', { domain });
  }, []);

  // Push the config whenever the selection changes (frame may not exist yet —
  // MFE_READY below covers the initial load).
  useEffect(() => {
    if (selectedConfig) pushConfigToFrame(selectedConfig, selectedWebsite?.domain);
  }, [selectedConfig, selectedWebsite?.domain, pushConfigToFrame]);

  const saveMutation = useMutation({
    mutationFn: ({ id, cdnConfig }: { id: string; cdnConfig: Record<string, unknown> }) =>
      saveWidgetConfigCdn(id, cdnConfig),
    onSuccess: () => {
      // Refetching updates the stored config, whose payload is exactly what
      // the MFE reported — so the baseline converges and dirty clears.
      setMfeState((prev) => (prev ? { ...prev, dirty: false } : prev));
      queryClient.invalidateQueries({ queryKey: widgetConfigKeys.all });
      toast.success('Config saved successfully');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to save config')
  });

  useEffect(() => {
    latestRef.current = {
      config: selectedConfig,
      baseline: selectedConfig ? stableStringify(unwrapCdnConfig(selectedConfig.cdnConfig)) : null,
      domain: selectedWebsite?.domain,
      save: saveMutation.mutate
    };
  });

  // Messages from the MFE iframe.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; cdnConfig?: unknown } | null;
      if (!data?.type) return;
      const latest = latestRef.current;

      if (data.type === 'MFE_READY') {
        pushConfigToFrame(latest.config, latest.domain);
      }

      if (data.type === 'WIDGET_CONFIG_CHANGED' || data.type === 'FORM_DIRTY') {
        if (Date.now() < muteChangedUntilRef.current) return;
        const configId = latest.config?.id ?? null;
        if (!data.cdnConfig || latest.baseline === null) {
          setMfeState({ configId, dirty: true });
          return;
        }
        const snapshot = stableStringify(unwrapCdnConfig(data.cdnConfig));
        setMfeState({ configId, dirty: snapshot !== latest.baseline });
      }

      if (data.type === 'SAVE_WIDGET_CONFIG') {
        if (!latest.config) {
          toast.error('Select or create a config preset first, then save.');
          return;
        }
        const cdn = unwrapCdnConfig(data.cdnConfig);
        if (Object.keys(cdn).length === 0) {
          toast.error('Widget configuration is empty. Customize something first.');
          return;
        }
        latest.save({ id: latest.config.id, cdnConfig: cdn });
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [pushConfigToFrame]);

  // Toolbar handlers -------------------------------------------------------

  const handleCustomerChange = (value: string | null) => {
    void setParams({ customerId: value, websiteId: null, configId: null });
  };

  const handleWebsiteChange = (value: string | null) => {
    void setParams({ websiteId: value, configId: null });
  };

  const handleSelectConfig = (config: WidgetConfig) => {
    void setParams({ configId: config.id });
    setConfigPopoverOpen(false);
  };

  const handleSave = () => {
    if (!selectedConfig || !isDirty || saveMutation.isPending) return;
    // Ask the MFE for its latest config; it answers with SAVE_WIDGET_CONFIG.
    if (!postToWidgetFrame('REQUEST_WIDGET_CONFIG')) {
      toast.error('Customization UI is not ready yet.');
    }
  };

  const handleUndo = () => {
    pushConfigToFrame(selectedConfig, selectedWebsite?.domain);
    setMfeState(null);
    toast.info('Unsaved changes undone');
  };


  // Config CRUD ------------------------------------------------------------

  const [configPopoverOpen, setConfigPopoverOpen] = useState(false);
  const [configSearch, setConfigSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [renameTarget, setRenameTarget] = useState<WidgetConfig | null>(null);
  const [renameName, setRenameName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<WidgetConfig | null>(null);

  const invalidateConfigs = () =>
    queryClient.invalidateQueries({ queryKey: widgetConfigKeys.all });

  const createMutation = useMutation({
    mutationFn: (name: string) => createWidgetConfig(name),
    onSuccess: (created) => {
      toast.success(`Config "${created.name}" created`);
      setCreateOpen(false);
      setNewName('');
      invalidateConfigs();
      void setParams({ configId: created.id });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create config')
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameWidgetConfig(id, name),
    onSuccess: (_res, vars) => {
      toast.success(`Config renamed to "${vars.name}"`);
      setRenameTarget(null);
      invalidateConfigs();
      queryClient.invalidateQueries({ queryKey: ['websites'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to rename config')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWidgetConfig(id),
    onSuccess: (_res, id) => {
      toast.success('Config deleted');
      setDeleteTarget(null);
      if (params.configId === id) void setParams({ configId: null });
      invalidateConfigs();
      queryClient.invalidateQueries({ queryKey: ['websites'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete config')
  });

  const filteredConfigs = configs.filter((c) =>
    c.name.toLowerCase().includes(configSearch.toLowerCase())
  );

  const isConfigLinkedToWebsite = (config: WidgetConfig) =>
    !!selectedWebsite &&
    (selectedWebsite.configId === config.id || selectedWebsite.configName === config.name);

  // ------------------------------------------------------------------------

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      {/* Toolbar */}
      <div className='flex flex-wrap items-center gap-2 border-b px-4 py-2'>
        <div className='flex items-center gap-1.5'>
          <span className='text-muted-foreground text-xs font-medium'>Customer</span>
          <Select value={params.customerId ?? ''} onValueChange={handleCustomerChange}>
            <SelectTrigger className='h-8 w-44 text-xs'>
              <SelectValue placeholder='Select customer' />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex items-center gap-1.5'>
          <span className='text-muted-foreground text-xs font-medium'>Website</span>
          {loadingWebsites ? (
            <Icons.spinner className='text-muted-foreground h-4 w-4 animate-spin' />
          ) : (
            <Select value={params.websiteId ?? ''} onValueChange={handleWebsiteChange}>
              <SelectTrigger className='h-8 w-44 text-xs'>
                <SelectValue
                  placeholder={params.customerId ? 'Select website' : 'Pick a customer first'}
                />
              </SelectTrigger>
              <SelectContent>
                {websites.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.domain}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className='flex items-center gap-1.5'>
          <span className='text-muted-foreground text-xs font-medium'>Config</span>
          <Popover open={configPopoverOpen} onOpenChange={setConfigPopoverOpen}>
            <PopoverTrigger
              render={
                <Button variant='outline' size='sm' className='h-8 w-48 justify-between text-xs' />
              }
            >
              <span className='truncate'>{selectedConfig?.name ?? 'Select config'}</span>
              <Icons.chevronDown className='ml-1 h-3.5 w-3.5 opacity-50' />
            </PopoverTrigger>
            <PopoverContent className='w-72 p-0' align='start'>
              <div className='flex items-center gap-2 border-b p-2'>
                <Icons.search className='text-muted-foreground h-3.5 w-3.5 shrink-0' />
                <Input
                  placeholder='Search configs...'
                  value={configSearch}
                  onChange={(e) => setConfigSearch(e.target.value)}
                  className='h-7 border-0 px-0 text-xs shadow-none focus-visible:ring-0'
                />
              </div>
              <div className='max-h-60 space-y-0.5 overflow-y-auto p-1'>
                {filteredConfigs.length === 0 ? (
                  <p className='text-muted-foreground py-4 text-center text-xs'>
                    No matching configs
                  </p>
                ) : (
                  filteredConfigs.map((config) => (
                    <div
                      key={config.id}
                      role='button'
                      tabIndex={0}
                      onClick={() => handleSelectConfig(config)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectConfig(config);
                        }
                      }}
                      className={cn(
                        'group flex cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-xs',
                        config.id === params.configId
                          ? 'bg-accent font-semibold'
                          : 'hover:bg-accent/60'
                      )}
                    >
                      <div className='flex min-w-0 items-center gap-2'>
                        <span className='w-4 shrink-0'>
                          {config.id === params.configId && <Icons.check className='h-3.5 w-3.5' />}
                        </span>
                        <span className='truncate'>{config.name}</span>
                        {isConfigLinkedToWebsite(config) && (
                          <Badge variant='default' className='shrink-0 text-[9px] uppercase'>
                            Active
                          </Badge>
                        )}
                      </div>
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant='ghost'
                              className='h-6 w-6 shrink-0 p-0 opacity-40 group-hover:opacity-100'
                              onClick={(e) => e.stopPropagation()}
                            />
                          }
                        >
                          <Icons.ellipsis className='h-3.5 w-3.5' />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenameTarget(config);
                              setRenameName(config.name);
                              setConfigPopoverOpen(false);
                            }}
                          >
                            <Icons.edit className='mr-2 h-3.5 w-3.5' /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(config);
                              setConfigPopoverOpen(false);
                            }}
                          >
                            <Icons.trash className='mr-2 h-3.5 w-3.5' /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))
                )}
              </div>
              <div className='border-t p-1'>
                <Button
                  variant='ghost'
                  size='sm'
                  className='w-full justify-start text-xs'
                  onClick={() => {
                    setCreateOpen(true);
                    setConfigPopoverOpen(false);
                  }}
                >
                  <Icons.add className='mr-2 h-3.5 w-3.5' /> Create new config
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className='ml-auto flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            className='h-8 text-xs'
            onClick={handleRefresh}
            disabled={!selectedWebsite}
          >
            <Icons.refresh className='mr-1 h-3.5 w-3.5' /> Refresh
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='h-8 text-xs'
            onClick={handleUndo}
            disabled={!selectedWebsite || !isDirty}
          >
            <Icons.undo className='mr-1 h-3.5 w-3.5' /> Undo
          </Button>
          <LoadingButton
            size='sm'
            className='h-8 text-xs'
            loading={saveMutation.isPending}
            onClick={handleSave}
            disabled={!selectedConfig || !isDirty || saveMutation.isPending}
          >
            <Icons.check className='mr-1 h-3.5 w-3.5' /> Save
          </LoadingButton>
        </div>
      </div>

      {/* Content */}
      <div className='relative min-h-0 flex-1'>
        {!selectedWebsite ? (
          <div className='bg-muted/20 flex h-full flex-col items-center justify-center p-8 text-center'>
            <div className='bg-background mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border'>
              <Icons.globe className='text-primary/70 h-7 w-7' />
            </div>
            <h3 className='mb-1 text-base font-semibold'>Select a customer and website</h3>
            <p className='text-muted-foreground max-w-sm text-xs'>
              Pick a customer and target website from the toolbar to customize and save the widget
              configuration.
            </p>
          </div>
        ) : (
          <RemoteMount
            key={selectedWebsite.id}
            websiteId={selectedWebsite.id}
            customerId={params.customerId ?? ''}
            domain={selectedWebsite.domain}
          />
        )}
      </div>

      {/* Create config dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Create new config</DialogTitle>
            <DialogDescription>
              A standalone reusable widget configuration preset stored in MongoDB.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-2 py-2'>
            <Label htmlFor='new-config-name'>Configuration name *</Label>
            <Input
              id='new-config-name'
              placeholder='e.g. Amber Theme, Black Friday Promo'
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newName.trim()) createMutation.mutate(newName);
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <LoadingButton
              loading={createMutation.isPending}
              disabled={!newName.trim()}
              onClick={() => createMutation.mutate(newName)}
            >
              Create Config
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename config dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Rename config</DialogTitle>
            <DialogDescription>
              Websites linked to this config keep working — the name is updated everywhere.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-2 py-2'>
            <Label htmlFor='rename-config-name'>New name *</Label>
            <Input
              id='rename-config-name'
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && renameName.trim() && renameTarget) {
                  renameMutation.mutate({ id: renameTarget.id, name: renameName });
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <LoadingButton
              loading={renameMutation.isPending}
              disabled={!renameName.trim()}
              onClick={() =>
                renameTarget && renameMutation.mutate({ id: renameTarget.id, name: renameName })
              }
            >
              Save Name
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete config confirmation */}
      <AlertModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
