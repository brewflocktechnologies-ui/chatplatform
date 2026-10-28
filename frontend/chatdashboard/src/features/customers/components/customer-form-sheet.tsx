'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormGrid, WIDE_FORM_MODAL } from '@/components/forms/form-grid';
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

const AddIcon = Icons.add;

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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

export function CustomerFormSheet({ customer, open, onOpenChange }: Readonly<CustomerFormSheetProps>) {
  const isEdit = !!customer;
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    ...createCustomerMutation,
    // Overriding onSuccess replaces the base invalidation — re-do it here.
    onSuccess: () => {
      invalidateEntity('customers', queryClient);
      toast.success('Customer created');
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't create customer. Try again."))
  });

  const updateMutation = useMutation({
    ...updateCustomerMutation,
    onSuccess: () => {
      invalidateEntity('customers', queryClient);
      toast.success('Customer updated');
      onOpenChange(false);
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't update customer. Try again."))
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
      try {
        if (isEdit) {
          await updateMutation.mutateAsync({ id: customer.id, values: payload });
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
          <SheetTitle>{isEdit ? 'Edit Customer' : 'New Customer'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update the customer details below.'
              : 'Fill in the details to create a new customer.'}
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-auto'>
          <form
            id='customer-form-sheet'
            className='space-y-4 p-4 md:p-4'
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <FormGrid>
              <form.AppField name='email'>
                {(field) => (
                  <field.TextField
                    label='Email'
                    type='email'
                    required
                    placeholder='billing@acme.com'
                  />
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
                {(field) => (
                  <field.TextField label='Address Line 1' placeholder='45 Mount Road' />
                )}
              </form.AppField>
              <form.AppField name='line2'>
                {(field) => (
                  <field.TextField label='Address Line 2' placeholder='Suite 12' />
                )}
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
          </form>
        </div>

        <SheetFooter>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <LoadingButton loading={isPending} type='submit' form='customer-form-sheet'>
            {isEdit ? 'Update Customer' : 'Create Customer'}
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function CustomerFormSheetTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <AddIcon className='mr-2 h-4 w-4' /> Add Customer
      </Button>
      <CustomerFormSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
