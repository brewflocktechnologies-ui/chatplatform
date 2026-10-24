/** Values the billing API accepts; anything else makes it return 500. */
export const WIDGET_POSITIONS = [
  'BOTTOM_RIGHT',
  'BOTTOM_LEFT',
  'TOP_RIGHT',
  'TOP_LEFT',
  'CENTER'
] as const;
export const WIDGET_THEMES = ['LIGHT', 'DARK', 'CUSTOM'] as const;

export type WidgetPosition = (typeof WIDGET_POSITIONS)[number];
export type WidgetTheme = (typeof WIDGET_THEMES)[number];

export type PocWidget = {
  id: number;
  companyId: number;
  assistantId: number;
  widgetName: string;
  websiteUrl: string | null;
  position: WidgetPosition;
  theme: WidgetTheme;
  primaryColor: string | null;
  greetingMessage: string | null;
  offlineMessage: string | null;
  showAgentName: boolean;
  showTypingIndicator: boolean;
  enableFileUpload: boolean;
  maxFileSizeMb: number | null;
  enableSoundNotification: boolean;
  autoPopup: boolean;
  popupDelaySeconds: number | null;
  isActive: boolean;
  totalImpressions: number;
  totalConversationsInitiated: number;
  lastActivityDate: string | null;
  createdDate: string | null;
  modifiedDate: string | null;
};

/**
 * Request body for POST /api/chat-assistant/widgets and PUT .../widgets/{id}.
 * Stats and audit dates are server-managed, so they are not sent.
 */
export type PocWidgetMutationPayload = Omit<
  PocWidget,
  | 'id'
  | 'totalImpressions'
  | 'totalConversationsInitiated'
  | 'lastActivityDate'
  | 'createdDate'
  | 'modifiedDate'
>;
