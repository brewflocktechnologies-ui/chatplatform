'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
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
import {
  CATEGORY_OPTIONS,
  PROTOCOL_OPTIONS
} from '@/features/websites/components/websites-table/options';
import { allCustomersQueryOptions } from '@/features/customers/api/queries';
import type { CustomerSort } from '@/features/customers/api/types';
import { toCustomerOption } from '@/features/customers/lib/customer-options';
import { createPocWebsite, updatePocWebsite } from '../api/service';
import type { PocWebsite, PocWebsiteMutationPayload } from '../api/types';
import { pocWebsiteSchema, type PocWebsiteFormValues } from '../schemas/poc-website';

interface PocWebsiteFormSheetProps {
  website?: PocWebsite;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// The API has no name, so the picker is sorted by email for scanning.
const CUSTOMER_SORT: CustomerSort = { field: 'email', dir: 'asc' };

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

export function PocWebsiteFormSheet({ website, open, onOpenChange }: PocWebsiteFormSheetProps) {
  const isEdit = !!website;
  const router = useRouter();

  // The list is server-rendered from the URL, so a refresh is what re-fetches it.
  const createMutation = useMutation({
    mutationFn: async (data: PocWebsiteMutationPayload) => unwrap(await createPocWebsite(data)),
    onSuccess: () => {
      router.refresh();
      toast.success('Website created');
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't create website. Try again."))
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: PocWebsiteMutationPayload }) =>
      unwrap(await updatePocWebsite(id, values)),
    onSuccess: () => {
      router.refresh();
      toast.success('Website updated');
      onOpenChange(false);
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't update website. Try again."))
  });

  const form = useAppForm({
    defaultValues: {
      protocol: website?.protocol.toUpperCase() ?? 'HTTPS',
      domain: website?.domain ?? '',
      customerId: website?.customerId ?? website?.companyId ?? '',
      customerName: website?.customerName ?? '',
      businessCategory: website?.businessCategory ?? '',
      flavour: website?.configName ?? website?.flavour ?? '',
      isActive: website?.isActive ?? true,
      isVerified: website?.isVerified ?? false
    } as PocWebsiteFormValues,
    validators: {
      onSubmit: pocWebsiteSchema
    },
    onSubmit: async ({ value }) => {
      const payload: PocWebsiteMutationPayload = {
        protocol: value.protocol,
        domain: value.domain,
        customerId: value.customerId,
        customerName: value.customerName,
        // The Websites tab treats the customer as the company; keep an existing link on edit.
        companyId: website?.companyId ?? value.customerId,
        businessCategory: value.businessCategory,
        flavour: value.flavour,
        configName: value.flavour,
        // Linked by the Widget Modifier, not this form.
        configId: website?.configId ?? null,
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

  const {
    data: customersData,
    isLoading: customersLoading,
    isError: customersError
  } = useQuery({ ...allCustomersQueryOptions(CUSTOMER_SORT), enabled: open });

  const customerOptions = useMemo(() => {
    const options = (customersData ?? []).map(toCustomerOption);
    // Keep the saved customer selectable on edit even if it isn't in the fetched list.
    const savedId = website?.customerId ?? website?.companyId;
    if (savedId && !options.some((o) => o.value === savedId)) {
      options.unshift({
        value: savedId,
        label: website?.customerName || savedId
      });
    }
    return options;
  }, [customersData, website]);

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
            id='poc-website-form-sheet'
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

              {/* Picking a customer sets both customerId and customerName. */}
              <form.AppField
                name='customerId'
                listeners={{
                  onChange: ({ value }) => {
                    const match = customerOptions.find((o) => o.value === value);
                    if (match) form.setFieldValue('customerName', match.label);
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
          <LoadingButton loading={isPending} type='submit' form='poc-website-form-sheet'>
            {isEdit ? 'Update Website' : 'Create Website'}
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function PocWebsiteFormSheetTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Icons.add className='mr-2 h-4 w-4' /> Add Website
      </Button>
      <PocWebsiteFormSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
