'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RowActions } from '@/components/ui/table/row-actions';
import { Icons } from '@/components/icons';
import { ApiError, unwrap } from '@/lib/billing/errors';
import { deletePocWidget } from '../api/service';
import type { PocWidget } from '../api/types';
import { PocWidgetFormSheet } from './poc-widget-form-sheet';

interface PocWidgetCellActionProps {
  readonly data: PocWidget;
}

export function PocWidgetCellAction({ data }: Readonly<PocWidgetCellActionProps>) {
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => unwrap(await deletePocWidget(id)),
    onSuccess: () => {
      router.refresh();
      toast.success('Widget deleted successfully');
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Failed to delete widget')
  });

  return (
    <RowActions
      items={[{ label: 'Update', icon: Icons.edit, onSelect: () => setEditOpen(true) }]}
      onDelete={(close) => deleteMutation.mutate(data.id, { onSuccess: close })}
      isDeleting={deleteMutation.isPending}
    >
      <PocWidgetFormSheet widget={data} open={editOpen} onOpenChange={setEditOpen} />
    </RowActions>
  );
}
