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
import { deleteWebsiteMutation } from '../../api/mutations';
import { websiteKeys } from '../../api/queries';
import type { Website } from '../../api/types';
import { Icons } from '@/components/icons';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { WebsiteFormSheet } from '../website-form-sheet';
import { WebsiteCodeDialog } from '../website-code-dialog';
import { WebsitePreviewDialog } from '../website-preview-dialog';

interface CellActionProps {
  data: Website;
}

export function CellAction({ data }: CellActionProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    ...deleteWebsiteMutation,
    // Overriding onSuccess replaces the base invalidation — re-do it here.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: websiteKeys.all });
      toast.success('Website deleted successfully');
      setDeleteOpen(false);
    },
    onError: () => {
      toast.error('Failed to delete website');
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
      <WebsiteFormSheet website={data} open={editOpen} onOpenChange={setEditOpen} />
      <WebsiteCodeDialog website={data} open={codeOpen} onOpenChange={setCodeOpen} />
      <WebsitePreviewDialog website={data} open={previewOpen} onOpenChange={setPreviewOpen} />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger render={<Button variant='ghost' className='h-8 w-8 p-0' />}>
          <span className='sr-only'>Open menu</span>
          <Icons.ellipsis className='h-4 w-4' />
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setPreviewOpen(true)}>
              <Icons.eye className='mr-2 h-4 w-4' /> Preview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCodeOpen(true)}>
              <Icons.code className='mr-2 h-4 w-4' /> Get Code
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Icons.edit className='mr-2 h-4 w-4' /> Update
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
