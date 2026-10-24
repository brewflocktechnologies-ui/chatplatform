'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useStore } from '@tanstack/react-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { LoadingButton } from '@/components/ui/loading-button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Icons } from '@/components/icons';
import { useAppForm } from '@/lib/form';
import { ApiError, unwrap } from '@/lib/billing/errors';
import { allCustomersQueryOptions } from '@/features/customers/api/queries';
import type { CustomerSort } from '@/features/customers/api/types';
import { toCustomerOption } from '@/features/customers/lib/customer-options';
import { allPocWebsitesQueryOptions } from '@/features/poc-website/api/queries';
import {
  belongsToCustomer,
  tenantIdOf,
  websiteLink
} from '@/features/poc-website/lib/website-link';
import { createPocConfig, updatePocConfig } from '../api/service';
import type { PocConfig, PocConfigMutationPayload } from '../api/types';
import { pocConfigSchema, type PocConfigFormValues } from '../schemas/poc-config';

interface PocConfigFormSheetProps {
  config?: PocConfig;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// The API has no name, so the picker is sorted by email for scanning.
const CUSTOMER_SORT: CustomerSort = { field: 'email', dir: 'asc' };

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

/** The API stores the settings as a JSON string; show it indented for editing. */
function prettyJson(value: string | undefined) {
  if (!value) return '{}';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export function PocConfigFormSheet({ config, open, onOpenChange }: PocConfigFormSheetProps) {
  const isEdit = !!config;
  const router = useRouter();

  // The table is server-rendered from the URL, so a refresh is what re-fetches it.
  const createMutation = useMutation({
    mutationFn: async (data: PocConfigMutationPayload) => unwrap(await createPocConfig(data)),
    onSuccess: () => {
      router.refresh();
      toast.success('Config created');
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't create config. Try again."))
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      values,
      version,
      createdBy
    }: {
      id: string;
      values: PocConfigMutationPayload;
      version: number;
      createdBy: string | null;
    }) => unwrap(await updatePocConfig(id, values, version, createdBy)),
    onSuccess: () => {
      router.refresh();
      toast.success('Config updated');
      onOpenChange(false);
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't update config. Try again."))
  });

  const form = useAppForm({
    defaultValues: {
      configName: config?.configName ?? '',
      tenantId: config?.tenantId ?? '',
      clientId: config?.clientId ?? '',
      clientName: config?.clientName ?? '',
      websiteId: config?.websiteId ?? '',
      websiteLink: config?.websiteLink ?? '',
      cdnConfig: prettyJson(config?.cdnConfig)
    } as PocConfigFormValues,
    validators: {
      onSubmit: pocConfigSchema
    },
    onSubmit: async ({ value }) => {
      const payload: PocConfigMutationPayload = {
        configName: value.configName.trim(),
        tenantId: value.tenantId.trim(),
        clientId: value.clientId.trim(),
        clientName: value.clientName.trim(),
        websiteId: value.websiteId.trim(),
        websiteLink: value.websiteLink.trim() || null,
        // Compact, so the stored string doesn't pick up the editor's indentation.
        cdnConfig: value.cdnConfig.trim() ? JSON.stringify(JSON.parse(value.cdnConfig)) : '{}'
      };
      try {
        if (isEdit) {
          await updateMutation.mutateAsync({
            id: config.id,
            values: payload,
            version: config.version,
            createdBy: config.createdBy
          });
        } else {
          await createMutation.mutateAsync(payload);
        }
      } catch {
        // Already reported by the mutation's onError.
      }
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    data: customers,
    isLoading: customersLoading,
    isError: customersError
  } = useQuery({ ...allCustomersQueryOptions(CUSTOMER_SORT), enabled: open });
  const {
    data: websites,
    isLoading: websitesLoading,
    isError: websitesError
  } = useQuery({ ...allPocWebsitesQueryOptions(), enabled: open });

  const clientId = useStore(form.store, (state) => state.values.clientId);

  const customerOptions = useMemo(() => {
    const options = (customers ?? []).map(toCustomerOption);
    // Keep the saved customer selectable on edit even if it isn't in the fetched list.
    if (config?.clientId && !options.some((o) => o.value === config.clientId)) {
      options.unshift({ value: config.clientId, label: config.clientName || config.clientId });
    }
    return options;
  }, [customers, config]);

  const websiteOptions = useMemo(() => {
    const options = (websites ?? [])
      .filter((w) => belongsToCustomer(w, clientId))
      .map((w) => ({ value: w.id, label: websiteLink(w) }));
    // Keep the saved website selectable on edit even if it isn't in the fetched list.
    if (config?.websiteId && !options.some((o) => o.value === config.websiteId)) {
      options.unshift({
        value: config.websiteId,
        label: config.websiteLink || config.websiteId
      });
    }
    return options;
  }, [websites, clientId, config]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='flex flex-col'>
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit Config' : 'New Config'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update the widget config below.'
              : 'Fill in the details to create a widget config.'}
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-auto'>
          <form
            id='poc-config-form-sheet'
            className='space-y-4 p-4 md:p-4'
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <FieldGroup>
              <form.AppField
                name='configName'
                children={(field) => (
                  <field.TextField label='Config Name' required placeholder='Deploy Test' />
                )}
              />
              {/* Picking a customer sets the client id and name, then its website. */}
              <form.AppField
                name='clientId'
                listeners={{
                  onChange: ({ value }) => {
                    const match = customerOptions.find((o) => o.value === value);
                    if (match) form.setFieldValue('clientName', match.label);
                    const sites = (websites ?? []).filter((w) => belongsToCustomer(w, value));
                    // A customer with one website needs no second choice.
                    form.setFieldValue('websiteId', sites.length === 1 ? sites[0].id : '');
                    if (sites.length !== 1) {
                      form.setFieldValue('websiteLink', '');
                      form.setFieldValue('tenantId', '');
                    }
                  }
                }}
                children={(field) => (
                  <field.ComboboxField
                    label='Customer'
                    required
                    options={customerOptions}
                    placeholder={customersLoading ? 'Loading customers...' : 'Select customer'}
                    searchPlaceholder='Search customers...'
                    emptyMessage={
                      customersError ? "Couldn't load customers." : 'No customers found.'
                    }
                  />
                )}
              />
              {/* Picking a website sets the website link and the tenant (its company). */}
              <form.AppField
                name='websiteId'
                listeners={{
                  onChange: ({ value }) => {
                    const site = websites?.find((w) => w.id === value);
                    if (!site) return;
                    form.setFieldValue('websiteLink', websiteLink(site));
                    form.setFieldValue('tenantId', tenantIdOf(site));
                  }
                }}
                children={(field) => (
                  <field.ComboboxField
                    label='Website'
                    required
                    options={websiteOptions}
                    placeholder={
                      !clientId
                        ? 'Select a customer first'
                        : websitesLoading
                          ? 'Loading websites...'
                          : 'Select website'
                    }
                    searchPlaceholder='Search websites...'
                    emptyMessage={
                      websitesError
                        ? "Couldn't load websites."
                        : 'This customer has no websites yet.'
                    }
                  />
                )}
              />
              <form.AppField
                name='tenantId'
                children={(field) => (
                  <field.TextField
                    label='Tenant ID'
                    required
                    readOnly
                    description="Taken from the selected website's company."
                  />
                )}
              />
              <form.AppField
                name='websiteLink'
                children={(field) => (
                  <field.TextField
                    label='Website Link'
                    readOnly
                    description='Taken from the selected website.'
                  />
                )}
              />
              <form.AppField
                name='cdnConfig'
                children={(field) => (
                  <field.TextareaField
                    label='CDN Config (JSON)'
                    rows={10}
                    className='font-mono text-xs'
                    description='Widget settings served from the CDN.'
                  />
                )}
              />
            </FieldGroup>
          </form>
        </div>

        <SheetFooter>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <LoadingButton loading={isPending} type='submit' form='poc-config-form-sheet'>
            {isEdit ? 'Update Config' : 'Create Config'}
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function PocConfigFormSheetTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Icons.add className='mr-2 h-4 w-4' /> Add Config
      </Button>
      <PocConfigFormSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
