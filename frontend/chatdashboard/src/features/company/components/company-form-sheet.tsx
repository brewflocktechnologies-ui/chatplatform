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
import { toast } from 'sonner';
import { createCompanyMutation, updateCompanyMutation } from '../api/mutations';
import { invalidateEntity } from '@/lib/cache/invalidation';
import { CompanyApiError } from '../api/errors';
import type { Company, CompanyMutationPayload } from '../api/types';
import { companySchema, type CompanyFormValues } from '../schemas/company';

interface CompanyFormSheetProps {
  company?: Company;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof CompanyApiError ? error.message : fallback;

// The API stores empty details as null, so blank strings are sent as null.
const orNull = (value: string) => value.trim() || null;

export function CompanyFormSheet({ company, open, onOpenChange }: CompanyFormSheetProps) {
  const isEdit = !!company;
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    ...createCompanyMutation,
    // Overriding onSuccess replaces the base invalidation — re-do it here.
    onSuccess: () => {
      invalidateEntity('companies', queryClient);
      toast.success('Company created');
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't create company. Try again."))
  });

  const updateMutation = useMutation({
    ...updateCompanyMutation,
    onSuccess: () => {
      invalidateEntity('companies', queryClient);
      toast.success('Company updated');
      onOpenChange(false);
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't update company. Try again."))
  });

  const d = company?.companyDetails;
  const h = company?.headquarters;

  const form = useAppForm({
    defaultValues: {
      name: company?.name ?? '',
      contactEmail: d?.contactEmail ?? '',
      contactPhone: d?.contactPhone ?? '',
      website: d?.website ?? '',
      industry: d?.industry ?? '',
      employeeCount: d?.employeeCount ?? undefined,
      streetAddress: h?.streetAddress ?? '',
      city: h?.city ?? '',
      state: h?.state ?? '',
      postalCode: h?.postalCode ?? '',
      country: h?.country ?? ''
    } as CompanyFormValues,
    validators: {
      onSubmit: companySchema
    },
    onSubmit: async ({ value }) => {
      const payload: CompanyMutationPayload = {
        name: value.name.trim(),
        companyDetails: {
          contactEmail: orNull(value.contactEmail),
          contactPhone: orNull(value.contactPhone),
          website: orNull(value.website),
          industry: orNull(value.industry),
          employeeCount: value.employeeCount ?? null
        },
        headquarters: {
          streetAddress: orNull(value.streetAddress),
          city: orNull(value.city),
          state: orNull(value.state),
          postalCode: orNull(value.postalCode),
          country: orNull(value.country)
        },
        // PUT replaces the whole company, so keep the links this form doesn't edit.
        customPlanIds: company?.customPlanIds ?? [],
        customerIds: company?.customerIds ?? []
      };
      try {
        if (isEdit) {
          await updateMutation.mutateAsync({ id: company.id, values: payload });
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
      <SheetContent side='center' className='flex flex-col'>
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit Company' : 'New Company'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update the company details below.'
              : 'Fill in the details to create a new company.'}
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-auto'>
          <form
            id='company-form-sheet'
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
                  <field.TextField label='Name' required placeholder='Acme Corp' />
                )}
              />
              <form.AppField
                name='contactEmail'
                children={(field) => (
                  <field.TextField
                    label='Contact Email'
                    type='email'
                    placeholder='hello@acme.com'
                  />
                )}
              />
              <form.AppField
                name='contactPhone'
                children={(field) => (
                  <field.TextField label='Contact Phone' type='tel' placeholder='+91-9123456780' />
                )}
              />
              <form.AppField
                name='website'
                children={(field) => (
                  <field.TextField label='Website' placeholder='https://www.acme.io' />
                )}
              />
              <form.AppField
                name='industry'
                children={(field) => <field.TextField label='Industry' placeholder='Fintech' />}
              />
              <form.AppField
                name='employeeCount'
                children={(field) => (
                  <field.TextField label='Employees' type='number' min={0} placeholder='220' />
                )}
              />
              <form.AppField
                name='streetAddress'
                children={(field) => (
                  <field.TextField label='Street Address' placeholder='45 Mount Road' />
                )}
              />
              <form.AppField
                name='city'
                children={(field) => <field.TextField label='City' placeholder='Bengaluru' />}
              />
              <form.AppField
                name='state'
                children={(field) => <field.TextField label='State' placeholder='Karnataka' />}
              />
              <form.AppField
                name='postalCode'
                children={(field) => <field.TextField label='Postal Code' placeholder='560001' />}
              />
              <form.AppField
                name='country'
                children={(field) => <field.TextField label='Country' placeholder='India' />}
              />
            </FieldGroup>
          </form>
        </div>

        <SheetFooter>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <LoadingButton loading={isPending} type='submit' form='company-form-sheet'>
            {isEdit ? 'Update Company' : 'Create Company'}
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function CompanyFormSheetTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Icons.add className='mr-2 h-4 w-4' /> Add Company
      </Button>
      <CompanyFormSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
