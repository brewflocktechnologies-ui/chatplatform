'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RowActions } from '@/components/ui/table/row-actions';
import { Icons } from '@/components/icons';
import { ApiError, unwrap } from '@/lib/billing/errors';
import { invalidateEntity } from '@/lib/cache/invalidation';
import { deletePocWebsite } from '../api/service';
import type { PocWebsite } from '../api/types';
import { PocWebsiteFormSheet } from './poc-website-form-sheet';

interface PocWebsiteCellActionProps {
  readonly data: PocWebsite;
}

export function PocWebsiteCellAction({ data }: Readonly<PocWebsiteCellActionProps>) {
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => unwrap(await deletePocWebsite(id)),
    onSuccess: () => {
      // The config form's website picker is cached client-side; refresh() alone doesn't touch it.
      void invalidateEntity('pocWebsites');
      router.refresh();
      toast.success('Website deleted successfully');
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Failed to delete website')
  });

  return (
    <RowActions
      items={[{ label: 'Update', icon: Icons.edit, onSelect: () => setEditOpen(true) }]}
      onDelete={(close) => deleteMutation.mutate(data.id, { onSuccess: close })}
      isDeleting={deleteMutation.isPending}
    >
      <PocWebsiteFormSheet website={data} open={editOpen} onOpenChange={setEditOpen} />
    </RowActions>
  );
}
