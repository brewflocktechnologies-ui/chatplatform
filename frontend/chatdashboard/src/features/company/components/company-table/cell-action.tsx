'use client';
import { RowActions } from '@/components/ui/table/row-actions';
import { deleteCompanyMutation } from '../../api/mutations';
import { invalidateEntity } from '@/lib/cache/invalidation';
import { CompanyApiError } from '../../api/errors';
import type { Company } from '../../api/types';
import { Icons } from '@/components/icons';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CompanyFormSheet } from '../company-form-sheet';

interface CellActionProps {
  readonly data: Company;
}

export function CellAction({ data }: Readonly<CellActionProps>) {
  const [editOpen, setEditOpen] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    ...deleteCompanyMutation,
    // Overriding onSuccess replaces the base invalidation — re-do it here.
    onSuccess: () => {
      invalidateEntity('companies', queryClient);
      toast.success('Company deleted successfully');
    },
    onError: (error) => {
      toast.error(error instanceof CompanyApiError ? error.message : 'Failed to delete company');
    }
  });

  return (
    <RowActions
      items={[{ label: 'Update', icon: Icons.edit, onSelect: () => setEditOpen(true) }]}
      onDelete={(close) => deleteMutation.mutate(data.id, { onSuccess: close })}
      isDeleting={deleteMutation.isPending}
    >
      <CompanyFormSheet company={data} open={editOpen} onOpenChange={setEditOpen} />
    </RowActions>
  );
}
