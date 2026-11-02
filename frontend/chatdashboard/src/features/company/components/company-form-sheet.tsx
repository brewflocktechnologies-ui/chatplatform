'use client';

import { FormSheet, FormSheetTrigger } from '@/components/forms/form-sheet';
import { FormGrid, FormRow } from '@/components/forms/form-grid';
import { useAppForm } from '@/lib/form';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createCompanyMutation, updateCompanyMutation } from '../api/mutations';
import { invalidateEntity } from '@/lib/cache/invalidation';
import { CompanyApiError } from '../api/errors';
import type { Company, CompanyMutationPayload } from '../api/types';
import { companySchema, type CompanyFormValues } from '../schemas/company';

interface CompanyFormSheetProps {
  readonly company?: Company;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof CompanyApiError ? error.message : fallback;

// The API stores empty details as null, so blank strings are sent as null.
const orNull = (value: string) => value.trim() || null;

export function CompanyFormSheet({ company, open, onOpenChange }: Readonly<CompanyFormSheetProps>) {
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
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit Company' : 'New Company'}
      description={
        isEdit
          ? 'Update the company details below.'
          : 'Fill in the details to create a new company.'
      }
      formId='company-form-sheet'
      onSubmit={() => form.handleSubmit()}
      isPending={isPending}
      submitLabel={isEdit ? 'Update Company' : 'Create Company'}
    >
      <FormGrid>
        <form.AppField name='name'>
          {(field) => <field.TextField label='Name' required placeholder='Acme Corp' />}
        </form.AppField>
        <form.AppField name='industry'>
          {(field) => <field.TextField label='Industry' placeholder='Fintech' />}
        </form.AppField>
        <form.AppField name='contactEmail'>
          {(field) => (
            <field.TextField label='Contact Email' type='email' placeholder='hello@acme.com' />
          )}
        </form.AppField>
        <form.AppField name='contactPhone'>
          {(field) => (
            <field.TextField label='Contact Phone' type='tel' placeholder='+91-9123456780' />
          )}
        </form.AppField>
        <form.AppField name='website'>
          {(field) => <field.TextField label='Website' placeholder='https://www.acme.io' />}
        </form.AppField>
        <form.AppField name='employeeCount'>
          {(field) => <field.TextField label='Employees' type='number' min={0} placeholder='220' />}
        </form.AppField>
        <FormRow>
          <form.AppField name='streetAddress'>
            {(field) => <field.TextField label='Street Address' placeholder='45 Mount Road' />}
          </form.AppField>
        </FormRow>
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

export function CompanyFormSheetTrigger() {
  return (
    <FormSheetTrigger label='Add Company'>
      {(open, setOpen) => <CompanyFormSheet open={open} onOpenChange={setOpen} />}
    </FormSheetTrigger>
  );
}
