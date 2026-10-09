'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertModal } from '@/components/modal/alert-modal';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Icons } from '@/components/icons';
import { deletePlanMutation, updatePlanMutation } from '../api/mutations';
import type { Plan } from '../api/types';
import { PlanFormSheet } from './plan-form-sheet';

export function PlanActiveSwitch({ plan }: { plan: Plan }) {
  const mutation = useMutation({
    ...updatePlanMutation,
    onError: () => toast.error("Couldn't change plan status.")
  });

  return (
    <Switch
      size='sm'
      checked={plan.active}
      disabled={mutation.isPending}
      aria-label={`${plan.active ? 'Deactivate' : 'Activate'} ${plan.name}`}
      onCheckedChange={(active) =>
        mutation.mutate({
          id: plan.id,
          values: {
            name: plan.name,
            description: plan.description,
            amountMonthly: plan.amountMonthly,
            amountAnnually: plan.amountAnnually,
            freePlan: plan.freePlan,
            defaultPlan: plan.defaultPlan,
            active
          }
        })
      }
    />
  );
}

export function PlanRowActions({ plan }: { plan: Plan }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const deleteMutation = useMutation({
    ...deletePlanMutation,
    onSuccess: (data, vars, ctx, mutation) => {
      deletePlanMutation.onSuccess?.(data, vars, ctx, mutation);
      toast.success('Plan deleted');
      setDeleteOpen(false);
    },
    onError: () => toast.error('Failed to delete plan')
  });

  return (
    <>
      <AlertModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate(plan.id)}
        loading={deleteMutation.isPending}
      />
      <PlanFormSheet plan={plan} open={editOpen} onOpenChange={setEditOpen} />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger render={<Button variant='ghost' className='h-8 w-8 p-0' />}>
          <span className='sr-only'>Open menu for {plan.name}</span>
          <Icons.ellipsis className='h-4 w-4' />
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Icons.edit className='mr-2 h-4 w-4' /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteOpen(true)}>
              <Icons.trash className='mr-2 h-4 w-4' /> Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
