'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
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
import { Icons } from '@/components/icons';
import { ApiError, unwrap } from '@/lib/billing/errors';
import { deletePocWidget } from '../api/service';
import type { PocWidget } from '../api/types';
import { PocWidgetFormSheet } from './poc-widget-form-sheet';

const EllipsisIcon = Icons.ellipsis;
const EditIcon = Icons.edit;
const TrashIcon = Icons.trash;

interface PocWidgetCellActionProps {
  readonly data: PocWidget;
}

export function PocWidgetCellAction({ data }: Readonly<PocWidgetCellActionProps>) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => unwrap(await deletePocWidget(id)),
    onSuccess: () => {
      router.refresh();
      toast.success('Widget deleted successfully');
      setDeleteOpen(false);
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Failed to delete widget')
  });

  return (
    <>
      <AlertModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate(data.id)}
        loading={deleteMutation.isPending}
      />
      <PocWidgetFormSheet widget={data} open={editOpen} onOpenChange={setEditOpen} />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger render={<Button variant='ghost' className='h-8 w-8 p-0' />}>
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
