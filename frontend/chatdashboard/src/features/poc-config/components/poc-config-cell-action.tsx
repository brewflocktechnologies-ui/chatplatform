'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RowActions } from '@/components/ui/table/row-actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Icons } from '@/components/icons';
import { ApiError, unwrap } from '@/lib/billing/errors';
import { deletePocConfig } from '../api/service';
import type { PocConfig } from '../api/types';
import { PocConfigFormSheet } from './poc-config-form-sheet';

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
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const router = useRouter();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => unwrap(await deletePocConfig(id)),
    onSuccess: () => {
      router.refresh();
      toast.success('Config deleted successfully');
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Failed to delete config')
  });

  return (
    <RowActions
      items={[
        { label: 'View config', icon: Icons.eye, onSelect: () => setViewOpen(true) },
        { label: 'Update', icon: Icons.edit, onSelect: () => setEditOpen(true) }
      ]}
      onDelete={(close) => deleteMutation.mutate(data.id, { onSuccess: close })}
      isDeleting={deleteMutation.isPending}
    >
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
    </RowActions>
  );
}
