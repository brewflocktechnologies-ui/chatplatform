'use client';
import { RowActions } from '@/components/ui/table/row-actions';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { invalidateEntity } from '@/lib/cache/invalidation';
import { deleteCustomerMutation } from '../../api/mutations';
import { CustomerApiError } from '../../api/errors';
import type { Customer } from '../../api/types';
import { CustomerFormSheet } from '../customer-form-sheet';

interface CellActionProps {
  readonly data: Customer;
}

export function CellAction({ data }: Readonly<CellActionProps>) {
  const [editOpen, setEditOpen] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    ...deleteCustomerMutation,
    // Overriding onSuccess replaces the base invalidation — re-do it here.
    onSuccess: () => {
      invalidateEntity('customers', queryClient);
      toast.success('Customer deleted successfully');
    },
    onError: (error) => {
      toast.error(error instanceof CustomerApiError ? error.message : 'Failed to delete customer');
    }
  });

  return (
    <RowActions
      items={[{ label: 'Update', icon: Icons.edit, onSelect: () => setEditOpen(true) }]}
      // The dialog closes whether the delete worked or not.
      onDelete={(close) => deleteMutation.mutate(data.id, { onSettled: close })}
      isDeleting={deleteMutation.isPending}
    >
      <CustomerFormSheet customer={data} open={editOpen} onOpenChange={setEditOpen} />
    </RowActions>
  );
}
