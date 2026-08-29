import { html } from 'lit';
import '../../components/organisms/cw-chat-form.js';
import {
  PRECHAT_SCHEMA,
  OFFLINE_SCHEMA,
  POSTCHAT_SCHEMA,
  TICKET_SCHEMA,
  type FormSchema,
} from '../../config/form-schemas.js';

const panelFrame = (story: any) => html`
  <div style="width: 360px; height: 560px; border-radius: 24px; overflow: hidden; box-shadow: 0 12px 36px rgba(0,0,0,.15); background: var(--cw-bg, #f8fafc); display: flex; flex-direction: column; margin: 20px auto;">
    ${story()}
  </div>
`;

const renderChatForm = (args: any) => {
  let baseSchema = PRECHAT_SCHEMA;
  if (args.schemaPreset === 'Offline') baseSchema = OFFLINE_SCHEMA;
  if (args.schemaPreset === 'Postchat') baseSchema = POSTCHAT_SCHEMA;
  if (args.schemaPreset === 'Ticket') baseSchema = TICKET_SCHEMA;

  const effectiveSchema: FormSchema = {
    ...baseSchema,
    title: args.title !== undefined && args.title !== '' ? args.title : baseSchema.title,
    subtitle: args.subtitle !== undefined ? args.subtitle : baseSchema.subtitle,
    submitLabel: args.submitLabel !== undefined && args.submitLabel !== '' ? args.submitLabel : baseSchema.submitLabel,
  };

  return html`
    <cw-chat-form
      .schema="${effectiveSchema}"
      .values="${args.values || {}}"
      .errors="${args.errors || {}}"
      ?submitting="${args.submitting}"
      ?disabled="${args.disabled}"
    ></cw-chat-form>
  `;
};

export default {
  title: 'Organisms/ChatForm',
  component: 'cw-chat-form',
  tags: ['autodocs'],
  decorators: [panelFrame],
  argTypes: {
    schema: { control: false },
    values: { control: false },
    errors: { control: false },
    schemaPreset: {
      control: 'select',
      options: ['Prechat', 'Offline', 'Postchat', 'Ticket'],
      name: 'Schema Preset',
      table: { category: '1. Form Config' },
    },
    title: {
      control: 'text',
      name: 'Form Title',
      table: { category: '1. Form Config' },
    },
    subtitle: {
      control: 'text',
      name: 'Form Subtitle',
      table: { category: '1. Form Config' },
    },
    submitLabel: {
      control: 'text',
      name: 'Submit Button Text',
      table: { category: '1. Form Config' },
    },
    submitting: {
      control: 'boolean',
      name: 'Is Submitting',
      table: { category: '2. Form State' },
    },
    disabled: {
      control: 'boolean',
      name: 'Is Disabled',
      table: { category: '2. Form State' },
    },
  },
  render: renderChatForm,
};

export const Prechat = {
  args: {
    schemaPreset: 'Prechat',
    title: 'Hi there 👋',
    subtitle: 'Please introduce yourself to start chatting.',
    submitLabel: 'Start Chat',
    submitting: false,
    disabled: false,
  },
};

export const Offline = {
  args: {
    schemaPreset: 'Offline',
    title: 'Leave a message',
    subtitle: 'We are currently offline. Leave a message and we will respond via email.',
    submitLabel: 'Send Message',
    submitting: false,
    disabled: false,
  },
};

export const Postchat = {
  args: {
    schemaPreset: 'Postchat',
    title: 'How did we do?',
    subtitle: 'Your feedback helps us improve our service.',
    submitLabel: 'Submit Feedback',
    submitting: false,
    disabled: false,
  },
};

export const Ticket = {
  args: {
    schemaPreset: 'Ticket',
    title: 'Submit a Support Ticket',
    subtitle: 'Describe your request in detail and support team will follow up.',
    submitLabel: 'Submit Ticket',
    submitting: false,
    disabled: false,
  },
};

export const WithErrors = {
  args: {
    schemaPreset: 'Prechat',
    title: 'Hi there 👋',
    subtitle: 'Please introduce yourself to start chatting.',
    submitLabel: 'Start Chat',
    values: { name: 'John Doe', email: 'invalid-email' },
    errors: { email: 'Enter a valid email address' },
    submitting: false,
    disabled: false,
  },
};

export const Submitting = {
  args: {
    schemaPreset: 'Prechat',
    title: 'Hi there 👋',
    subtitle: 'Please introduce yourself to start chatting.',
    submitLabel: 'Start Chat',
    values: { name: 'John Doe', email: 'john@example.com' },
    submitting: true,
    disabled: false,
  },
};
