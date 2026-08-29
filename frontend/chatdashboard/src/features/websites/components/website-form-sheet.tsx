'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { useAppForm } from '@/lib/form';
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createWebsiteMutation, updateWebsiteMutation } from '../api/mutations';
import { websiteKeys } from '../api/queries';
import type { Website, WebsiteMutationPayload } from '../api/types';
import { customersQueryOptions } from '@/features/customers/api/queries';
import { toast } from 'sonner';
import { websiteSchema, type WebsiteFormValues } from '../schemas/website';
import { PROTOCOL_OPTIONS, CATEGORY_OPTIONS } from './websites-table/options';

interface WebsiteFormSheetProps {
  website?: Website;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WebsiteFormSheet({ website, open, onOpenChange }: WebsiteFormSheetProps) {
  const isEdit = !!website;
  const queryClient = useQueryClient();

  // Customers from MongoDB feed the owner dropdown.
  const { data: customersData } = useQuery({
    ...customersQueryOptions({ page: 1, limit: 100 }),
    enabled: open
  });
  const customers = customersData?.customers ?? [];
  const customerOptions = customers.map((c) => ({
    value: c.id,
    label: c.email ? `${c.name} (${c.email})` : c.name
  }));

  const createMutation = useMutation({
    ...createWebsiteMutation,
    // Overriding onSuccess replaces the base invalidation — re-do it here.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: websiteKeys.all });
      toast.success('Website created');
      onOpenChange(false);
      form.reset();
    },
    onError: () => toast.error("Couldn't create website. Try again.")
  });

  const updateMutation = useMutation({
    ...updateWebsiteMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: websiteKeys.all });
      toast.success('Website updated');
      onOpenChange(false);
    },
    onError: () => toast.error("Couldn't update website. Try again.")
  });

  const form = useAppForm({
    defaultValues: {
      protocol: website?.protocol ?? 'HTTPS',
      domain: website?.domain ?? '',
      customerId: website?.customerId ?? website?.companyId ?? '',
      businessCategory: website?.businessCategory ?? '',
      flavour: website?.configName ?? website?.flavour ?? '',
      isActive: website?.isActive ?? true,
      isVerified: website?.isVerified ?? false
    } as WebsiteFormValues,
    validators: {
      onSubmit: websiteSchema
    },
    onSubmit: async ({ value }) => {
      const customer = customers.find((c) => c.id === value.customerId);
      const payload: WebsiteMutationPayload = {
        protocol: value.protocol,
        domain: value.domain,
        customerId: value.customerId,
        customerName: customer?.name ?? website?.customerName ?? '',
        companyId: value.customerId,
        businessCategory: value.businessCategory,
        flavour: value.flavour,
        configName: value.flavour,
        isActive: value.isActive,
        isVerified: value.isVerified
      };
      if (isEdit) {
        await updateMutation.mutateAsync({ id: website.id, values: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='flex flex-col'>
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit Website' : 'New Website'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update the website details below.'
              : 'Fill in the details to register a new website.'}
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-auto'>
          <form
            id='website-form-sheet'
            className='space-y-4 p-4 md:p-4'
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <FieldGroup>
              <div className='grid grid-cols-[8rem_1fr] gap-4'>
                <form.AppField
                  name='protocol'
                  children={(field) => (
                    <field.SelectField label='Protocol' required options={PROTOCOL_OPTIONS} />
                  )}
                />
                <form.AppField
                  name='domain'
                  children={(field) => (
                    <field.TextField label='Domain' required placeholder='example.com' />
                  )}
                />
              </div>

              <form.AppField
                name='customerId'
                children={(field) => (
                  <field.SelectField
                    label='Customer'
                    required
                    options={customerOptions}
                    placeholder={
                      customerOptions.length === 0 ? 'Loading customers...' : 'Select customer'
                    }
                  />
                )}
              />

              <form.AppField
                name='businessCategory'
                children={(field) => (
                  <field.SelectField
                    label='Business Category'
                    required
                    options={CATEGORY_OPTIONS}
                    placeholder='Select category'
                  />
                )}
              />

              <form.AppField
                name='flavour'
                children={(field) => (
                  <field.TextField
                    label='Flavour / Config Name'
                    required
                    placeholder='Orange'
                    description='Widget config this website uses.'
                  />
                )}
              />

              <form.AppField
                name='isActive'
                children={(field) => (
                  <field.SwitchField
                    label='Active'
                    description='Serve the chat widget on this website.'
                  />
                )}
              />

              <form.AppField
                name='isVerified'
                children={(field) => (
                  <field.SwitchField
                    label='Verified'
                    description='Domain ownership has been verified.'
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
          <LoadingButton loading={isPending} type='submit' form='website-form-sheet'>
            {isEdit ? 'Update Website' : 'Create Website'}
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function WebsiteFormSheetTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Icons.add className='mr-2 h-4 w-4' /> Add Website
      </Button>
      <WebsiteFormSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
