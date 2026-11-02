'use client';

import type { ReactNode } from 'react';
import { FormGrid, FormRow } from '@/components/forms/form-grid';
import { withForm } from '@/lib/form';
import type { WebsiteFormValues } from '../schemas/website';
import { CATEGORY_OPTIONS, PROTOCOL_OPTIONS } from './websites-table/options';

// The fields of the website forms (Websites and POC Websites tabs). Only the customer picker
// differs between them, so each form passes it in.
export const WebsiteFormFields = withForm({
  defaultValues: {} as WebsiteFormValues,
  props: { customerField: null as ReactNode },
  render: function Render({ form, customerField }) {
    return (
      <FormGrid>
        <form.AppField name='protocol'>
          {(field) => <field.SelectField label='Protocol' required options={PROTOCOL_OPTIONS} />}
        </form.AppField>
        <form.AppField name='domain'>
          {(field) => <field.TextField label='Domain' required placeholder='example.com' />}
        </form.AppField>
        <FormRow>{customerField}</FormRow>
        <form.AppField name='businessCategory'>
          {(field) => (
            <field.SelectField
              label='Business Category'
              required
              options={CATEGORY_OPTIONS}
              placeholder='Select category'
            />
          )}
        </form.AppField>
        <form.AppField name='flavour'>
          {(field) => (
            <field.TextField
              label='Flavour / Config Name'
              required
              placeholder='Orange'
              description='Widget config this website uses.'
            />
          )}
        </form.AppField>
        <form.AppField name='isActive'>
          {(field) => (
            <field.SwitchField
              label='Active'
              description='Serve the chat widget on this website.'
            />
          )}
        </form.AppField>
        <form.AppField name='isVerified'>
          {(field) => (
            <field.SwitchField label='Verified' description='Domain ownership has been verified.' />
          )}
        </form.AppField>
      </FormGrid>
    );
  }
});
