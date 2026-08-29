import { html } from 'lit';
import '../../components/molecules/cw-form-field.js';
import type { FormField } from '../../config/form-schemas.js';

const renderFormField = (args: any) => {
  const effectiveField: FormField = {
    name: args.name || 'sampleField',
    label: args.label || 'Field Label',
    type: (args.fieldType || 'text') as any,
    required: args.required ?? true,
    placeholder: args.placeholder || 'Enter value...',
    options: args.fieldType === 'select' ? [
      { value: 'sales', label: 'Sales & Inquiries' },
      { value: 'support', label: 'Technical Support' },
      { value: 'billing', label: 'Billing & Accounting' },
    ] : undefined,
  };

  return html`
    <div style="max-width: 360px; padding: 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <cw-form-field
        .field="${effectiveField}"
        .value="${args.value || ''}"
        .error="${args.error || ''}"
        ?disabled="${args.disabled}"
      ></cw-form-field>
    </div>
  `;
};

export default {
  title: 'Molecules/FormField',
  component: 'cw-form-field',
  tags: ['autodocs'],
  argTypes: {
    field: { control: false },
    label: {
      control: 'text',
      name: 'Field Label',
      table: { category: '1. Field Config' },
    },
    fieldType: {
      control: 'select',
      options: ['text', 'email', 'textarea', 'select'],
      name: 'Field Type',
      table: { category: '1. Field Config' },
    },
    placeholder: {
      control: 'text',
      name: 'Placeholder',
      table: { category: '1. Field Config' },
    },
    required: {
      control: 'boolean',
      name: 'Required (*)',
      table: { category: '1. Field Config' },
    },
    value: {
      control: 'text',
      name: 'Current Value',
      table: { category: '2. State' },
    },
    error: {
      control: 'text',
      name: 'Error Message',
      table: { category: '2. State' },
    },
    disabled: {
      control: 'boolean',
      name: 'Disabled State',
      table: { category: '2. State' },
    },
  },
  render: renderFormField,
};

export const TextField = {
  args: {
    label: 'Full Name',
    fieldType: 'text',
    required: true,
    placeholder: 'John Doe',
    value: '',
    error: '',
    disabled: false,
  },
};

export const EmailField = {
  args: {
    label: 'Email Address',
    fieldType: 'email',
    required: true,
    placeholder: 'john@example.com',
    value: 'john@example.com',
    error: '',
    disabled: false,
  },
};

export const TextareaField = {
  args: {
    label: 'Message',
    fieldType: 'textarea',
    required: true,
    placeholder: 'Write your message here...',
    value: '',
    error: '',
    disabled: false,
  },
};

export const SelectField = {
  args: {
    label: 'Department',
    fieldType: 'select',
    required: true,
    placeholder: 'Select a department',
    value: '',
    error: '',
    disabled: false,
  },
};

export const WithValidationError = {
  args: {
    label: 'Work Email',
    fieldType: 'email',
    required: true,
    placeholder: 'you@company.com',
    value: 'invalid-email',
    error: 'Please enter a valid email address',
    disabled: false,
  },
};

export const DisabledField = {
  args: {
    label: 'Username',
    fieldType: 'text',
    required: false,
    placeholder: 'Read-only field',
    value: 'john_doe_99',
    error: '',
    disabled: true,
  },
};
