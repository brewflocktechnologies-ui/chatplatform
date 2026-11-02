'use client';

import { FormSheet, FormSheetTrigger } from '@/components/forms/form-sheet';
import { FormGrid } from '@/components/forms/form-grid';
import { useAppForm } from '@/lib/form';

import { useQueryClient } from '@tanstack/react-query';
import { useCreateUpdateMutations } from '@/hooks/use-create-update-mutations';
import { invalidateEntity } from '@/lib/cache/invalidation';
import { createCustomerMutation, updateCustomerMutation } from '../api/mutations';
import { CustomerApiError } from '../api/errors';
import type { Customer, CustomerMutationPayload } from '../api/types';
import { customerSchema, type CustomerFormValues } from '../schemas/customer';

interface CustomerFormSheetProps {
  readonly customer?: Customer;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof CustomerApiError ? error.message : fallback;

export function CustomerFormSheet({
  customer,
  open,
  onOpenChange
}: Readonly<CustomerFormSheetProps>) {
  const isEdit = !!customer;
  const queryClient = useQueryClient();

  const { save, isPending } = useCreateUpdateMutations({
    noun: 'customer',
    create: createCustomerMutation,
    update: updateCustomerMutation,
    onSaved: () => invalidateEntity('customers', queryClient),
    onOpenChange,
    onCreated: () => form.reset(),
    errorMessage
  });

  const a = customer?.billingAddress;

  const form = useAppForm({
    defaultValues: {
      email: customer?.email ?? '',
      externalId: customer?.externalId ?? '',
      line1: a?.line1 ?? '',
      line2: a?.line2 ?? '',
      city: a?.city ?? '',
      state: a?.state ?? '',
      postalCode: a?.postalCode ?? '',
      country: a?.country ?? ''
    } as CustomerFormValues,
    validators: {
      onSubmit: customerSchema
    },
    onSubmit: async ({ value }) => {
      // The API merges on update: null keeps the stored value and "" clears it. So a cleared
      // field is sent as "" when editing, and as null (nothing to store) when creating.
      const blank = isEdit ? '' : null;
      const text = (v: string) => v.trim() || blank;
      const payload: CustomerMutationPayload = {
        email: value.email.trim(),
        externalId: text(value.externalId),
        billingAddress: {
          line1: text(value.line1),
          line2: text(value.line2),
          city: text(value.city),
          state: text(value.state),
          postalCode: text(value.postalCode),
          country: text(value.country)
        }
      };
      await save(customer?.id, payload);
    }
  });

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit Customer' : 'New Customer'}
      description={
        isEdit
          ? 'Update the customer details below.'
          : 'Fill in the details to create a new customer.'
      }
      formId='customer-form-sheet'
      onSubmit={() => form.handleSubmit()}
      isPending={isPending}
      submitLabel={isEdit ? 'Update Customer' : 'Create Customer'}
    >
      <FormGrid>
        <form.AppField name='email'>
          {(field) => (
            <field.TextField label='Email' type='email' required placeholder='billing@acme.com' />
          )}
        </form.AppField>
        <form.AppField name='externalId'>
          {(field) => (
            <field.TextField
              label='External ID'
              placeholder='cus_123'
              description='The customer id in your payment system.'
            />
          )}
        </form.AppField>
        <form.AppField name='line1'>
          {(field) => <field.TextField label='Address Line 1' placeholder='45 Mount Road' />}
        </form.AppField>
        <form.AppField name='line2'>
          {(field) => <field.TextField label='Address Line 2' placeholder='Suite 12' />}
        </form.AppField>
        <form.AppField name='city'>
          {(field) => <field.TextField label='City' placeholder='Bengaluru' />}
        </form.AppField>
        <form.AppField name='state'>
          {(field) => <field.TextField label='State' placeholder='Karnataka' />}
        </form.AppField>
        <form.AppField name='postalCode'>
          {(field) => <field.TextField label='Postal Code' placeholder='560001' />}
        </form.AppField>
        <form.AppField name='country'>
          {(field) => <field.TextField label='Country' placeholder='India' />}
        </form.AppField>
      </FormGrid>
    </FormSheet>
  );
}

export function CustomerFormSheetTrigger() {
  return (
    <FormSheetTrigger label='Add Customer'>
      {(open, setOpen) => <CustomerFormSheet open={open} onOpenChange={setOpen} />}
    </FormSheetTrigger>
  );
}
