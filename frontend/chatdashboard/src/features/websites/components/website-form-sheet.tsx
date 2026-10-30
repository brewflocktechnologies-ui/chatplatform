'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormGrid, FormRow, WIDE_FORM_MODAL } from '@/components/forms/form-grid';
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createWebsiteMutation, updateWebsiteMutation } from '../api/mutations';
import { invalidateEntity } from '@/lib/cache/invalidation';
import type { Website, WebsiteMutationPayload } from '../api/types';
import { useCustomerOptions } from '@/features/customers/hooks/use-customer-options';
import type { CustomerSort } from '@/features/customers/api/types';
import { toast } from 'sonner';
import { websiteSchema, type WebsiteFormValues } from '../schemas/website';
import { PROTOCOL_OPTIONS, CATEGORY_OPTIONS } from './websites-table/options';

// The API has no name, so the picker is sorted by email for scanning.
const CUSTOMER_SORT: CustomerSort = { field: 'email', dir: 'asc' };

interface WebsiteFormSheetProps {
  website?: Website;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WebsiteFormSheet({ website, open, onOpenChange }: WebsiteFormSheetProps) {
  const isEdit = !!website;
  const queryClient = useQueryClient();

  // Customers from the billing API feed the owner dropdown.
  const { options: customerOptions } = useCustomerOptions({
    sort: CUSTOMER_SORT,
    savedId: website?.customerId ?? website?.companyId,
    savedName: website?.customerName,
    enabled: open
  });

  const createMutation = useMutation({
    ...createWebsiteMutation,
    // Overriding onSuccess replaces the base invalidation — re-do it here.
    onSuccess: () => {
      invalidateEntity('websites', queryClient);
      toast.success('Website created');
      onOpenChange(false);
      form.reset();
    },
    onError: () => toast.error("Couldn't create website. Try again.")
  });

  const updateMutation = useMutation({
    ...updateWebsiteMutation,
    onSuccess: () => {
      invalidateEntity('websites', queryClient);
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
      const customer = customerOptions.find((o) => o.value === value.customerId);
      const payload: WebsiteMutationPayload = {
        protocol: value.protocol,
        domain: value.domain,
        customerId: value.customerId,
        customerName: customer?.label ?? website?.customerName ?? '',
        companyId: value.customerId,
        businessCategory: value.businessCategory,
        flavour: value.flavour,
        configName: value.flavour,
        isActive: value.isActive,
        isVerified: value.isVerified
      };
      try {
        if (isEdit) {
          await updateMutation.mutateAsync({ id: website.id, values: payload });
        } else {
          await createMutation.mutateAsync(payload);
        }
      } catch {
        // Already reported by the mutation's onError.
      }
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='center' className={WIDE_FORM_MODAL}>
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
            <FormGrid>
              <form.AppField name='protocol'>
                {(field) => (
                  <field.SelectField label='Protocol' required options={PROTOCOL_OPTIONS} />
                )}
              </form.AppField>
              <form.AppField name='domain'>
                {(field) => <field.TextField label='Domain' required placeholder='example.com' />}
              </form.AppField>
              <FormRow>
                <form.AppField name='customerId'>
                  {(field) => (
                    <field.SelectField
                      label='Customer'
                      required
                      options={customerOptions}
                      placeholder={
                        customerOptions.length === 0 ? 'Loading customers...' : 'Select customer'
                      }
                    />
                  )}
                </form.AppField>
              </FormRow>
              <form.AppField name='businessCategory'>
                {(field) => (
                  <field.SelectField
                    label='Business Category'
                    required
                    options={CATEGORY_OPTIONS}
                    placeholder='Select category'
                  />
                )}
              </form.AppField>
              <form.AppField name='flavour'>
                {(field) => (
                  <field.TextField
                    label='Flavour / Config Name'
                    required
                    placeholder='Orange'
                    description='Widget config this website uses.'
                  />
                )}
              </form.AppField>
              <form.AppField name='isActive'>
                {(field) => (
                  <field.SwitchField
                    label='Active'
                    description='Serve the chat widget on this website.'
                  />
                )}
              </form.AppField>
              <form.AppField name='isVerified'>
                {(field) => (
                  <field.SwitchField
                    label='Verified'
                    description='Domain ownership has been verified.'
                  />
                )}
              </form.AppField>
            </FormGrid>
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
