'use client';
import { RowActions } from '@/components/ui/table/row-actions';
import { deleteWebsiteMutation } from '../../api/mutations';
import { invalidateEntity } from '@/lib/cache/invalidation';
import type { Website } from '../../api/types';
import { Icons } from '@/components/icons';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { WebsiteFormSheet } from '../website-form-sheet';
import { WebsiteCodeDialog } from '../website-code-dialog';
import { WebsitePreviewDialog } from '../website-preview-dialog';

interface CellActionProps {
  readonly data: Website;
}

export function CellAction({ data }: Readonly<CellActionProps>) {
  const [editOpen, setEditOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    ...deleteWebsiteMutation,
    // Overriding onSuccess replaces the base invalidation — re-do it here.
    onSuccess: () => {
      invalidateEntity('websites', queryClient);
      toast.success('Website deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete website');
    }
  });

  return (
    <RowActions
      items={[
        { label: 'Preview', icon: Icons.eye, onSelect: () => setPreviewOpen(true) },
        { label: 'Get Code', icon: Icons.code, onSelect: () => setCodeOpen(true) },
        { label: 'Update', icon: Icons.edit, onSelect: () => setEditOpen(true) }
      ]}
      onDelete={(close) => deleteMutation.mutate(data.id, { onSuccess: close })}
      isDeleting={deleteMutation.isPending}
    >
      <WebsiteFormSheet website={data} open={editOpen} onOpenChange={setEditOpen} />
      <WebsiteCodeDialog website={data} open={codeOpen} onOpenChange={setCodeOpen} />
      <WebsitePreviewDialog website={data} open={previewOpen} onOpenChange={setPreviewOpen} />
    </RowActions>
  );
}
