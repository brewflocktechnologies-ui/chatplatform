'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertModal } from '@/components/modal/alert-modal';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
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
import { deletePocConfig } from '../api/service';
import type { PocConfig } from '../api/types';
import { PocConfigFormSheet } from './poc-config-form-sheet';

const EllipsisIcon = Icons.ellipsis;
const EyeIcon = Icons.eye;
const EditIcon = Icons.edit;
const TrashIcon = Icons.trash;

function formatCdnConfig(value: string) {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

interface PocConfigCellActionProps {
  readonly data: PocConfig;
}

export function PocConfigCellAction({ data }: Readonly<PocConfigCellActionProps>) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const router = useRouter();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => unwrap(await deletePocConfig(id)),
    onSuccess: () => {
      router.refresh();
      toast.success('Config deleted successfully');
      setDeleteOpen(false);
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Failed to delete config')
  });

  return (
    <>
      <AlertModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate(data.id)}
        loading={deleteMutation.isPending}
      />
      <PocConfigFormSheet config={data} open={editOpen} onOpenChange={setEditOpen} />
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>{data.configName} config</DialogTitle>
            <DialogDescription>CDN config served to the widget.</DialogDescription>
          </DialogHeader>
          <pre className='bg-muted max-h-[60vh] overflow-auto rounded-lg border p-4 font-mono text-xs'>
            {formatCdnConfig(data.cdnConfig)}
          </pre>
        </DialogContent>
      </Dialog>
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
            <DropdownMenuItem onClick={() => setViewOpen(true)}>
              <EyeIcon className='mr-2 h-4 w-4' /> View config
            </DropdownMenuItem>
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
