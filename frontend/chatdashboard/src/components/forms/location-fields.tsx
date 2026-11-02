'use client';

import type { ComponentType } from 'react';

// Any form from `useAppForm` whose values have city, state, postalCode and country.
interface LocationFieldsProps {
  readonly form: { readonly AppField: ComponentType<any> };
}

// The city / state / postal code / country inputs shared by the customer and company forms.
export function LocationFields({ form }: Readonly<LocationFieldsProps>) {
  return (
    <>
      <form.AppField name='city'>
        {(field: any) => <field.TextField label='City' placeholder='Bengaluru' />}
      </form.AppField>
      <form.AppField name='state'>
        {(field: any) => <field.TextField label='State' placeholder='Karnataka' />}
      </form.AppField>
      <form.AppField name='postalCode'>
        {(field: any) => <field.TextField label='Postal Code' placeholder='560001' />}
      </form.AppField>
      <form.AppField name='country'>
        {(field: any) => <field.TextField label='Country' placeholder='India' />}
      </form.AppField>
    </>
  );
}
