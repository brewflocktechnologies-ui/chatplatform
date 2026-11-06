'use client';

import { FormSheet, FormSheetTrigger } from '@/components/forms/form-sheet';
import { useRouter } from 'next/navigation';
import { useCreateUpdateMutations } from '@/hooks/use-create-update-mutations';
import { WebsiteFormFields } from '@/features/websites/components/website-form-fields';

import { useAppForm } from '@/lib/form';
import { ApiError, unwrap } from '@/lib/billing/errors';
import { invalidateEntity } from '@/lib/cache/invalidation';
import { useCustomerOptions } from '@/features/customers/hooks/use-customer-options';
import type { CustomerSort } from '@/features/customers/api/types';
import { createPocWebsite, updatePocWebsite } from '../api/service';
import type { PocWebsite, PocWebsiteMutationPayload } from '../api/types';
import { pocWebsiteSchema, type PocWebsiteFormValues } from '../schemas/poc-website';

interface PocWebsiteFormSheetProps {
  readonly website?: PocWebsite;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

// The API has no name, so the picker is sorted by email for scanning.
const CUSTOMER_SORT: CustomerSort = { field: 'email', dir: 'asc' };

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

export function PocWebsiteFormSheet({
  website,
  open,
  onOpenChange
}: Readonly<PocWebsiteFormSheetProps>) {
  const isEdit = !!website;
  const router = useRouter();

  // The list is server-rendered from the URL, so a refresh is what re-fetches it.
  const { save, isPending } = useCreateUpdateMutations({
    noun: 'website',
    create: {
      mutationFn: async (data: PocWebsiteMutationPayload) => unwrap(await createPocWebsite(data))
    },
    update: {
      mutationFn: async ({ id, values }: { id: string; values: PocWebsiteMutationPayload }) =>
        unwrap(await updatePocWebsite(id, values))
    },
    onSaved: () => {
      void invalidateEntity('pocWebsites');
      router.refresh();
    },
    onOpenChange,
    onCreated: () => form.reset(),
    errorMessage
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
      // The name has no field of its own: take it from the chosen customer, else keep what is stored.
      const customerName =
        customerOptions.find((o) => o.value === value.customerId)?.label || value.customerName;
      const payload: PocWebsiteMutationPayload = {
        protocol: value.protocol,
        domain: value.domain,
        customerId: value.customerId,
        customerName,
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
      await save(website?.id, payload);
    }
  });

  const {
    options: customerOptions,
    isLoading: customersLoading,
    isError: customersError
  } = useCustomerOptions({
    sort: CUSTOMER_SORT,
    savedId: website?.customerId ?? website?.companyId,
    savedName: website?.customerName,
    enabled: open
  });

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit Website' : 'New Website'}
      description={
        isEdit
          ? 'Update the website details below.'
          : 'Fill in the details to register a new website.'
      }
      formId='poc-website-form-sheet'
      onSubmit={() => form.handleSubmit()}
      isPending={isPending}
      submitLabel={isEdit ? 'Update Website' : 'Create Website'}
    >
      <WebsiteFormFields
        form={form}
        customerField={
          /* Picking a customer sets both customerId and customerName. */
          <form.AppField
            name='customerId'
            listeners={{
              onChange: ({ value }) => {
                const match = customerOptions.find((o) => o.value === value);
                if (match) form.setFieldValue('customerName', match.label);
              }
            }}
          >
            {(field) => (
              <field.ComboboxField
                label='Customer'
                required
                options={customerOptions}
                placeholder={customersLoading ? 'Loading customers...' : 'Select customer'}
                searchPlaceholder='Search customers...'
                emptyMessage={customersError ? "Couldn't load customers." : 'No customers found.'}
              />
            )}
          </form.AppField>
        }
      />
    </FormSheet>
  );
}

export function PocWebsiteFormSheetTrigger() {
  return (
    <FormSheetTrigger label='Add Website'>
      {(open, setOpen) => <PocWebsiteFormSheet open={open} onOpenChange={setOpen} />}
    </FormSheetTrigger>
  );
}
