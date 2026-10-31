'use client';
import { AlertModal } from '@/components/modal/alert-modal';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { deleteCompanyMutation } from '../../api/mutations';
import { invalidateEntity } from '@/lib/cache/invalidation';
import { CompanyApiError } from '../../api/errors';
import type { Company } from '../../api/types';
import { Icons } from '@/components/icons';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CompanyFormSheet } from '../company-form-sheet';

const EllipsisIcon = Icons.ellipsis;
const EditIcon = Icons.edit;
const TrashIcon = Icons.trash;

interface CellActionProps {
  readonly data: Company;
}

export function CellAction({ data }: Readonly<CellActionProps>) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    ...deleteCompanyMutation,
    // Overriding onSuccess replaces the base invalidation — re-do it here.
    onSuccess: () => {
      invalidateEntity('companies', queryClient);
      toast.success('Company deleted successfully');
      setDeleteOpen(false);
    },
    onError: (error) => {
      toast.error(error instanceof CompanyApiError ? error.message : 'Failed to delete company');
    }
  });

  return (
    <>
      <AlertModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate(data.id)}
        loading={deleteMutation.isPending}
      />
      <CompanyFormSheet company={data} open={editOpen} onOpenChange={setEditOpen} />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger render={<Button type='button' variant='ghost' className='h-8 w-8 p-0' />}>
          <span className='sr-only'>Open menu</span>
          <EllipsisIcon className='h-4 w-4' />
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <EditIcon className='mr-2 h-4 w-4' /> Update
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteOpen(true)}>
              <TrashIcon className='mr-2 h-4 w-4' /> Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
