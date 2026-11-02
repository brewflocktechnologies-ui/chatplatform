'use client';

import { withForm } from '@/lib/form';
import { categoryOptions } from '@/features/products/constants/product-options';
import type { ProductFormValues } from '@/features/products/schemas/product';

// The name / category / price inputs shared by the product page form and the product sheet.
export const ProductFields = withForm({
  defaultValues: {} as ProductFormValues,
  render: function Render({ form }) {
    return (
      <>
        <form.AppField name='name'>
          {(field) => (
            <field.TextField label='Product Name' required placeholder='Enter product name' />
          )}
        </form.AppField>

        <form.AppField name='category'>
          {(field) => (
            <field.SelectField
              label='Category'
              required
              options={categoryOptions}
              placeholder='Select category'
            />
          )}
        </form.AppField>

        <form.AppField name='price'>
          {(field) => (
            <field.TextField
              label='Price'
              required
              type='number'
              min={0}
              step={0.01}
              placeholder='Enter price'
            />
          )}
        </form.AppField>
      </>
    );
  }
});
