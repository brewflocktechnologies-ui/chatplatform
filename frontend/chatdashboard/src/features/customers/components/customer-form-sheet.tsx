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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCustomerMutation, updateCustomerMutation } from '../api/mutations';
import { customerKeys } from '../api/queries';
import type { Customer, CustomerMutationPayload } from '../api/types';
import { toast } from 'sonner';
import { customerSchema, type CustomerFormValues } from '../schemas/customer';
import { parseIntegrations, stringifyIntegrations } from '../lib/integrations';
import { PLAN_OPTIONS, STATUS_OPTIONS } from './customers-table/options';

interface CustomerFormSheetProps {
  customer?: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerFormSheet({ customer, open, onOpenChange }: CustomerFormSheetProps) {
  const isEdit = !!customer;
  const integrations = parseIntegrations(customer?.integrations);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    ...createCustomerMutation,
    // Overriding onSuccess replaces the base invalidation — re-do it here.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      toast.success('Customer created');
      onOpenChange(false);
      form.reset();
    },
    onError: () => toast.error("Couldn't create customer. Try again.")
  });

  const updateMutation = useMutation({
    ...updateCustomerMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      toast.success('Customer updated');
      onOpenChange(false);
    },
    onError: () => toast.error("Couldn't update customer. Try again.")
  });

  const form = useAppForm({
    defaultValues: {
      name: customer?.name ?? '',
      email: customer?.email ?? '',
      country: customer?.country ?? '',
      activePlanName: customer?.activePlanName ?? '',
      status: customer?.status ?? 'active',
      crm: integrations.crm,
      analytics: integrations.analytics
    } as CustomerFormValues,
    validators: {
      onSubmit: customerSchema
    },
    onSubmit: async ({ value }) => {
      const payload: CustomerMutationPayload = {
        name: value.name,
        email: value.email,
        country: value.country,
        activePlanName: value.activePlanName,
        status: value.status,
        integrations: stringifyIntegrations({ crm: value.crm, analytics: value.analytics })
      };
      if (isEdit) {
        await updateMutation.mutateAsync({ id: customer.id, values: payload });
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
            <FieldGroup>
              <form.AppField
                name='name'
                children={(field) => (
                  <field.TextField label='Name' required placeholder='Acme Inc.' />
                )}
              />

              <form.AppField
                name='email'
                children={(field) => (
                  <field.TextField
                    label='Email'
                    required
                    type='email'
                    placeholder='team@acme.com'
                  />
                )}
              />

              <form.AppField
                name='country'
                children={(field) => (
                  <field.TextField label='Country' required placeholder='india' />
                )}
              />

              <form.AppField
                name='activePlanName'
                children={(field) => (
                  <field.SelectField
                    label='Active Plan'
                    required
                    options={PLAN_OPTIONS}
                    placeholder='Select plan'
                  />
                )}
              />

              <form.AppField
                name='status'
                children={(field) => (
                  <field.SelectField
                    label='Status'
                    required
                    options={STATUS_OPTIONS}
                    placeholder='Select status'
                  />
                )}
              />

              <form.AppField
                name='crm'
                children={(field) => (
                  <field.SwitchField
                    label='CRM Integration'
                    description='Sync this customer with the CRM.'
                  />
                )}
              />

              <form.AppField
                name='analytics'
                children={(field) => (
                  <field.SwitchField
                    label='Analytics Integration'
                    description='Enable analytics tracking for this customer.'
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
        <Icons.add className='mr-2 h-4 w-4' /> Add Customer
      </Button>
      <CustomerFormSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
