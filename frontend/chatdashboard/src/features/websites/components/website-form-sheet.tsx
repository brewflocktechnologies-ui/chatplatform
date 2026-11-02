'use client';

import { FormSheet, FormSheetTrigger } from '@/components/forms/form-sheet';
import { useAppForm } from '@/lib/form';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateUpdateMutations } from '@/hooks/use-create-update-mutations';
import { createWebsiteMutation, updateWebsiteMutation } from '../api/mutations';
import { invalidateEntity } from '@/lib/cache/invalidation';
import type { Website, WebsiteMutationPayload } from '../api/types';
import { useCustomerOptions } from '@/features/customers/hooks/use-customer-options';
import type { CustomerSort } from '@/features/customers/api/types';
import { websiteSchema, type WebsiteFormValues } from '../schemas/website';
import { WebsiteFormFields } from './website-form-fields';

// The API has no name, so the picker is sorted by email for scanning.
const CUSTOMER_SORT: CustomerSort = { field: 'email', dir: 'asc' };

interface WebsiteFormSheetProps {
  website?: Website;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WebsiteFormSheet({ website, open, onOpenChange }: Readonly<WebsiteFormSheetProps>) {
  const isEdit = !!website;
  const queryClient = useQueryClient();

  // Customers from the billing API feed the owner dropdown.
  const { options: customerOptions } = useCustomerOptions({
    sort: CUSTOMER_SORT,
    savedId: website?.customerId ?? website?.companyId,
    savedName: website?.customerName,
    enabled: open
  });

  const { save, isPending } = useCreateUpdateMutations({
    noun: 'website',
    create: createWebsiteMutation,
    update: updateWebsiteMutation,
    onSaved: () => invalidateEntity('websites', queryClient),
    onOpenChange,
    onCreated: () => form.reset()
  });

  const form = useAppForm({
    defaultValues: {
      protocol: website?.protocol ?? 'HTTPS',
      domain: website?.domain ?? '',
      customerId: website?.customerId ?? website?.companyId ?? '',
      customerName: website?.customerName ?? '',
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
      await save(website?.id, payload);
    }
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
      formId='website-form-sheet'
      onSubmit={() => form.handleSubmit()}
      isPending={isPending}
      submitLabel={isEdit ? 'Update Website' : 'Create Website'}
    >
      <WebsiteFormFields
        form={form}
        customerField={
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
        }
      />
    </FormSheet>
  );
}

export function WebsiteFormSheetTrigger() {
  return (
    <FormSheetTrigger label='Add Website'>
      {(open, setOpen) => <WebsiteFormSheet open={open} onOpenChange={setOpen} />}
    </FormSheetTrigger>
  );
}
