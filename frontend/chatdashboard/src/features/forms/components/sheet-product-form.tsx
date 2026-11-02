'use client';

import { useAppForm } from '@/lib/form';
import * as z from 'zod';
import { FieldGroup } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { FormSheet } from '@/components/forms/form-sheet';
import { useState } from 'react';
import { ProductFields } from '@/features/products/components/product-fields';

// The sheet has no image input; `image` only keeps the values shaped like the product page form.
const productSchema = z.object({
  image: z.custom<File[] | undefined>(),
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  category: z.string().min(1, 'Please select a category'),
  price: z.number({ error: 'Price is required' }).min(0.01, 'Price must be greater than 0'),
  description: z.string().min(10, 'Description must be at least 10 characters')
});

export default function SheetProductForm() {
  const [open, setOpen] = useState(false);

  const form = useAppForm({
    defaultValues: {
      image: undefined as File[] | undefined,
      name: '',
      category: '',
      price: undefined as number | undefined,
      description: ''
    },
    validators: {
      onSubmit: productSchema
    },
    onSubmit: () => {
      alert('Product created successfully!');
      setOpen(false);
      form.reset();
    }
  });

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Icons.add className='mr-2 h-4 w-4' />
        Add Product
      </Button>
      <FormSheet
        open={open}
        onOpenChange={setOpen}
        title='New Product'
        description='Fill in the details to create a new product.'
        formId='sheet-product-form'
        onSubmit={() => form.handleSubmit()}
        isPending={false}
        submitLabel='Create Product'
      >
        <FieldGroup>
          <ProductFields form={form} />

          <form.AppField name='description'>
            {(field) => (
              <field.TextareaField
                label='Description'
                required
                placeholder='Enter product description'
                maxLength={500}
                rows={4}
                showCount
              />
            )}
          </form.AppField>
        </FieldGroup>
      </FormSheet>
    </>
  );
}
