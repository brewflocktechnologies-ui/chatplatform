import { mutationOptions } from '@tanstack/react-query';
import { invalidateEntity } from '@/lib/cache/invalidation';
import { createProduct, updateProduct, deleteProduct } from './service';
import type { ProductMutationPayload } from './types';

export const createProductMutation = mutationOptions({
  mutationFn: (data: ProductMutationPayload) => createProduct(data),
  onSuccess: () => {
    invalidateEntity('products');
  }
});

export const updateProductMutation = mutationOptions({
  mutationFn: ({ id, values }: { id: number; values: ProductMutationPayload }) =>
    updateProduct(id, values),
  onSuccess: () => {
    invalidateEntity('products');
  }
});

export const deleteProductMutation = mutationOptions({
  mutationFn: (id: number) => deleteProduct(id),
  onSuccess: () => {
    invalidateEntity('products');
  }
});
