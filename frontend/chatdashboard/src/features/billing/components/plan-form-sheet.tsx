'use client';

import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
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
import { PlanApiError } from '../api/errors';
import { createPlanMutation, updatePlanMutation } from '../api/mutations';
import type { Plan, PlanMutationPayload } from '../api/types';
import { toPayload } from '../lib/plan-payload';
import { planSchema, type PlanFormValues } from '../schemas/plan';

const FORM_FIELDS = [
  'name',
  'description',
  'amountMonthly',
  'amountAnnually',
  'active',
  'freePlan',
  'defaultPlan',
  'custom'
] as const satisfies readonly (keyof PlanFormValues)[];

function toDefaults(plan?: Plan): PlanFormValues {
  return {
    name: plan?.name ?? '',
    description: plan?.description ?? '',
    amountMonthly: plan?.amountMonthly ?? 0,
    amountAnnually: plan?.amountAnnually ?? 0,
    active: plan?.active ?? true,
    freePlan: plan?.freePlan ?? false,
    defaultPlan: plan?.defaultPlan ?? false,
    custom: plan?.custom ?? false
  };
}

const selectAll = (e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.select();

interface PlanFormSheetProps {
  plan?: Plan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlanFormSheet({ plan, open, onOpenChange }: PlanFormSheetProps) {
  const isEdit = !!plan;

  const createMutation = useMutation({
    ...createPlanMutation,
    onSuccess: (data, vars, ctx, mutation) => {
      createPlanMutation.onSuccess?.(data, vars, ctx, mutation);
      toast.success('Plan created');
      onOpenChange(false);
    },
    onError: (error) => reportError(error, "Couldn't create plan. Try again.")
  });

  const updateMutation = useMutation({
    ...updatePlanMutation,
    onSuccess: (data, vars, ctx, mutation) => {
      updatePlanMutation.onSuccess?.(data, vars, ctx, mutation);
      toast.success('Plan updated');
      onOpenChange(false);
    },
    onError: (error) => reportError(error, "Couldn't update plan. Try again.")
  });

  /** Field-level 400s paint on the matching inputs; anything else becomes a toast. */
  function reportError(error: Error, fallback: string) {
    const fieldErrors = error instanceof PlanApiError ? error.fieldErrors : undefined;
    const unmatched: string[] = [];

    for (const [name, message] of Object.entries(fieldErrors ?? {})) {
      if (FORM_FIELDS.includes(name as keyof PlanFormValues)) {
        form.setFieldMeta(name as keyof PlanFormValues, (meta) => ({
          ...meta,
          errorMap: { ...meta.errorMap, onSubmit: { message } }
        }));
      } else {
        unmatched.push(message);
      }
    }

    if (!fieldErrors || unmatched.length > 0) {
      toast.error(unmatched.join('. ') || error.message || fallback);
    }
  }

  const form = useAppForm({
    defaultValues: toDefaults(plan),
    validators: { onSubmit: planSchema },
    onSubmit: async ({ value }) => {
      const edited = {
        ...value,
        description: value.description.trim() || null
      };
      try {
        if (isEdit) {
          // PUT replaces the whole plan, so carry over fields this form doesn't edit.
          await updateMutation.mutateAsync({
            id: plan.id,
            values: toPayload(plan, edited)
          });
        } else {
          const payload: PlanMutationPayload = {
            ...edited,
            companyIds: [],
            smartChatModule: null,
            managedAccountsModule: null,
            planProductPrice: null
          };
          await createMutation.mutateAsync(payload);
        }
      } catch {
        // Already reported by the mutation's onError.
      }
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  // One long-lived instance: each time the sheet opens (or is pointed at another plan) the
  // values restart from that plan, instead of remounting the whole sheet.
  useEffect(() => {
    if (open) form.reset(toDefaults(plan));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form is stable
  }, [open, plan]);

  return (
    // disablePointerDismissal: an outside click or focus change must not discard edits in progress.
    <Sheet open={open} onOpenChange={onOpenChange} disablePointerDismissal>
      <SheetContent className='flex flex-col'>
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit plan' : 'New plan'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Changes apply to the plan for every account on it.'
              : 'Define pricing and availability for a new plan.'}
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-auto'>
          <form
            id='plan-form-sheet'
            className='space-y-4 p-4'
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <FieldGroup>
              <form.AppField
                name='name'
                children={(field) => <field.TextField label='Name' required placeholder='Growth' />}
              />
              <form.AppField
                name='description'
                children={(field) => (
                  <field.TextareaField label='Description' placeholder='Who is this plan for?' />
                )}
              />
              <div className='grid grid-cols-2 gap-4'>
                <form.AppField
                  name='amountMonthly'
                  children={(field) => (
                    <field.TextField
                      label='Monthly ($)'
                      required
                      type='number'
                      min={0}
                      onFocus={selectAll}
                    />
                  )}
                />
                <form.AppField
                  name='amountAnnually'
                  children={(field) => (
                    <field.TextField
                      label='Annual ($)'
                      required
                      type='number'
                      min={0}
                      onFocus={selectAll}
                    />
                  )}
                />
              </div>
              <form.AppField
                name='active'
                children={(field) => (
                  <field.SwitchField
                    label='Active'
                    description='Inactive plans are hidden from new subscribers.'
                  />
                )}
              />
              <form.AppField
                name='freePlan'
                children={(field) => (
                  <field.SwitchField
                    label='Free plan'
                    description='Shown as Free regardless of price.'
                  />
                )}
              />
              <form.AppField
                name='defaultPlan'
                children={(field) => (
                  <field.SwitchField
                    label='Default plan'
                    description='Assigned to new accounts automatically.'
                  />
                )}
              />
              <form.AppField
                name='custom'
                children={(field) => (
                  <field.SwitchField
                    label='Custom plan'
                    description='Negotiated for specific companies rather than listed publicly.'
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
          <LoadingButton loading={isPending} type='submit' form='plan-form-sheet'>
            {isEdit ? 'Save changes' : 'Create plan'}
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function PlanFormSheetTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Icons.add className='mr-2 h-4 w-4' /> New plan
      </Button>
      <PlanFormSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
