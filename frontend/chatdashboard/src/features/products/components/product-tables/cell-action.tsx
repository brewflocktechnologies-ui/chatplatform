'use client';
import { RowActions } from '@/components/ui/table/row-actions';
import { deleteProductMutation } from '../../api/mutations';
import type { Product } from '../../api/types';
import { Icons } from '@/components/icons';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

interface CellActionProps {
  readonly data: Product;
}

export function CellAction({ data }: Readonly<CellActionProps>) {
  const router = useRouter();

  const deleteMutation = useMutation({
    ...deleteProductMutation,
    onSuccess: () => {
      toast.success('Product deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete product');
    }
  });

  return (
    <RowActions
      items={[
        {
          label: 'Update',
          icon: Icons.edit,
          onSelect: () => router.push(`/dashboard/product/${data.id}`)
        }
      ]}
      onDelete={(close) => deleteMutation.mutate(data.id, { onSuccess: close })}
      isDeleting={deleteMutation.isPending}
    />
  );
}
