export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'textarea' | 'select' | 'tel' | 'number';
  required?: boolean;
  placeholder?: string;
  options?: FormFieldOption[];
  rows?: number;
}

export interface FormSchema {
  id: string;
  title: string;
  subtitle?: string;
  fields: FormField[];
  submitLabel: string;
}

export const PRECHAT_SCHEMA: FormSchema = {
  id: 'prechat',
  title: 'Hi there 👋',
  subtitle: 'Please introduce yourself to start chatting.',
  submitLabel: 'Start Chat',
  fields: [
    {
      name: 'name',
      label: 'Your Name',
      type: 'text',
      required: true,
      placeholder: 'John Doe',
    },
    {
      name: 'email',
      label: 'Email Address',
      type: 'email',
      required: true,
      placeholder: 'john@example.com',
    },
  ],
};

export const OFFLINE_SCHEMA: FormSchema = {
  id: 'offline',
  title: "We're away right now",
  subtitle: 'Leave a message and we will respond via email as soon as possible.',
  submitLabel: 'Send Message',
  fields: [
    {
      name: 'name',
      label: 'Your Name',
      type: 'text',
      required: true,
      placeholder: 'John Doe',
    },
    {
      name: 'email',
      label: 'Email Address',
      type: 'email',
      required: true,
      placeholder: 'john@example.com',
    },
    {
      name: 'message',
      label: 'Your Message',
      type: 'textarea',
      required: true,
      placeholder: 'How can we help you?',
      rows: 4,
    },
  ],
};

export const POSTCHAT_SCHEMA: FormSchema = {
  id: 'postchat',
  title: 'How was your experience?',
  subtitle: 'We value your feedback to improve our support service.',
  submitLabel: 'Submit Feedback',
  fields: [
    {
      name: 'rating',
      label: 'Rating',
      type: 'select',
      required: true,
      placeholder: 'Select a rating',
      options: [
        { value: '5', label: '⭐⭐⭐⭐⭐ Excellent' },
        { value: '4', label: '⭐⭐⭐⭐ Good' },
        { value: '3', label: '⭐⭐⭐ Average' },
        { value: '2', label: '⭐⭐ Poor' },
        { value: '1', label: '⭐ Terrible' },
      ],
    },
    {
      name: 'comments',
      label: 'Additional Feedback',
      type: 'textarea',
      required: false,
      placeholder: 'Tell us how we did...',
      rows: 3,
    },
    {
      name: 'email',
      label: 'Email (Optional for follow-up)',
      type: 'email',
      required: false,
      placeholder: 'john@example.com',
    },
  ],
};

export const TICKET_SCHEMA: FormSchema = {
  id: 'ticket',
  title: 'Submit a Support Ticket',
  subtitle: 'Our support team will review your request and get back to you.',
  submitLabel: 'Submit Ticket',
  fields: [
    {
      name: 'name',
      label: 'Full Name',
      type: 'text',
      required: true,
      placeholder: 'John Doe',
    },
    {
      name: 'email',
      label: 'Work Email',
      type: 'email',
      required: true,
      placeholder: 'john@company.com',
    },
    {
      name: 'subject',
      label: 'Issue Subject',
      type: 'text',
      required: true,
      placeholder: 'Brief summary of the issue',
    },
    {
      name: 'description',
      label: 'Detailed Description',
      type: 'textarea',
      required: true,
      placeholder: 'Describe what happened and steps to reproduce...',
      rows: 4,
    },
  ],
};
