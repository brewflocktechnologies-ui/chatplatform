import * as z from 'zod';
import { WIDGET_POSITIONS, WIDGET_THEMES } from '../api/types';

export const pocWidgetSchema = z.object({
  widgetName: z.string().trim().min(1, 'Widget name is required'),
  companyId: z
    .number({ error: 'Company ID is required' })
    .int('Must be a whole number')
    .positive('Must be positive'),
  assistantId: z
    .number({ error: 'Assistant ID is required' })
    .int('Must be a whole number')
    .positive('Must be positive'),
  websiteUrl: z.union([z.literal(''), z.url('Enter a full URL like https://example.com')]),
  position: z.enum(WIDGET_POSITIONS),
  theme: z.enum(WIDGET_THEMES),
  primaryColor: z.string().regex(/^#[0-9a-f]{6}$/i, 'Use a hex color like #007bff'),
  greetingMessage: z.string(),
  offlineMessage: z.string(),
  showAgentName: z.boolean(),
  showTypingIndicator: z.boolean(),
  enableFileUpload: z.boolean(),
  maxFileSizeMb: z
    .number({ error: 'Max file size is required' })
    .int('Must be a whole number')
    .min(1, 'Must be at least 1'),
  enableSoundNotification: z.boolean(),
  autoPopup: z.boolean(),
  popupDelaySeconds: z
    .number()
    .int('Must be a whole number')
    .min(0, 'Cannot be negative')
    .optional(),
  isActive: z.boolean()
});

export type PocWidgetFormValues = z.infer<typeof pocWidgetSchema>;
