'use client';

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
import { toPayload } from '../lib/plan-payload';

export function PlanActiveSwitch({ plan }: { plan: Plan }) {
  const mutation = useMutation({
    ...updatePlanMutation,
    onError: (error) =>
      toast.error(error.message || "Couldn't change plan status.")
  });

  return (
    <Switch
      size='sm'
      checked={plan.active}
      disabled={mutation.isPending}
      aria-label={`${plan.active ? 'Deactivate' : 'Activate'} ${plan.name}`}
      onCheckedChange={(active) =>
        mutation.mutate({ id: plan.id, values: toPayload(plan, { active }) })
      }
    />
  );
}

/**
 * Row menu only. The edit sheet and delete dialog live once in the page, so a
 * row re-rendering or moving after a refetch can't tear down an open dialog.
 */
export function PlanRowActions({
  plan,
  onEdit,
  onDelete
}: {
  plan: Plan;
  onEdit: (plan: Plan) => void;
  onDelete: (plan: Plan) => void;
}) {
  return (
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
          <DropdownMenuItem onClick={() => onEdit(plan)}>
            <Icons.edit className='mr-2 h-4 w-4' /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDelete(plan)}>
            <Icons.trash className='mr-2 h-4 w-4' /> Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PlanDeleteModal({
  plan,
  open,
  onOpenChange
}: {
  plan: Plan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = useMutation({
    ...deletePlanMutation,
    onSuccess: (data, vars, ctx, mutation) => {
      deletePlanMutation.onSuccess?.(data, vars, ctx, mutation);
      toast.success('Plan deleted');
      onOpenChange(false);
    },
    onError: (error) => toast.error(error.message || 'Failed to delete plan')
  });

  return (
    <AlertModal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      onConfirm={() => plan && mutation.mutate(plan.id)}
      loading={mutation.isPending}
    />
  );
}
