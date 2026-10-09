'use client';

import { useState } from 'react';
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
import { createPlanMutation, updatePlanMutation } from '../api/mutations';
import type { Plan, PlanMutationPayload } from '../api/types';
import { planSchema, type PlanFormValues } from '../schemas/plan';

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
      form.reset();
    },
    onError: () => toast.error("Couldn't create plan. Try again.")
  });

  const updateMutation = useMutation({
    ...updatePlanMutation,
    onSuccess: (data, vars, ctx, mutation) => {
      updatePlanMutation.onSuccess?.(data, vars, ctx, mutation);
      toast.success('Plan updated');
      onOpenChange(false);
    },
    onError: () => toast.error("Couldn't update plan. Try again.")
  });

  const form = useAppForm({
    defaultValues: {
      name: plan?.name ?? '',
      description: plan?.description ?? '',
      amountMonthly: plan?.amountMonthly ?? 0,
      amountAnnually: plan?.amountAnnually ?? 0,
      active: plan?.active ?? true,
      freePlan: plan?.freePlan ?? false,
      defaultPlan: plan?.defaultPlan ?? false
    } as PlanFormValues,
    validators: { onSubmit: planSchema },
    onSubmit: async ({ value }) => {
      const payload: PlanMutationPayload = {
        ...value,
        description: value.description.trim() || null
      };
      if (isEdit) {
        await updateMutation.mutateAsync({ id: plan.id, values: payload });
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
                children={(field) => (
                  <field.TextField label='Name' required placeholder='Growth' />
                )}
              />
              <form.AppField
                name='description'
                children={(field) => (
                  <field.TextareaField
                    label='Description'
                    placeholder='Who is this plan for?'
                  />
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
            </FieldGroup>
          </form>
        </div>

        <SheetFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
          >
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
