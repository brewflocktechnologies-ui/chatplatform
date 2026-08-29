/**
 * store/types.ts
 * Pure type definitions shared across the widget.
 * This module has NO runtime side-effects and does NOT import the store
 * singleton, so presentational components can depend on it without
 * coupling to state logic (truly modular atomic design).
 */

export interface Message {
  key: string;
  senderType: 'AGENT' | 'VISITOR' | 'SYSTEM';
  senderName?: string;
  body: string;
  created?: string;
  status?: 'sent' | 'delivered' | 'read';
  pending?: boolean;
  attachment?: boolean;
  localUrl?: string;
  url?: string;
  fileSize?: string;
  [key: string]: any;
}

export interface ConfirmBoxConfig {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export interface ChatState {
  state: 'welcome' | 'boot' | 'prechat' | 'offline' | 'offline-sent' | 'queued' | 'active' | 'postchat' | 'closed';
  isExpanded: boolean;
  panelOpen: boolean;
  unreadCount: number;
  isMobile: boolean;
  clientName: string;
  agentName: string;
  agentsOnline: boolean;
  token: string;
  position: number;
  menuOpen: boolean;
  attachOpen: boolean;
  emojiOpen: boolean;
  confirmBox: ConfirmBoxConfig | null;
  reconnecting: boolean;
  soundsOn: boolean;
  consentDismissed?: boolean;
  draft?: string;
  uploading?: boolean;
  typingName?: string;
  offlineName?: string;
  offlineEmail?: string;
  offlineMessage?: string;
  offlineSending?: boolean;
  hasSentMessage?: boolean;
  lastFeedback?: Record<string, string>;
  flags: Record<string, boolean>;
  messages: Message[];
  [key: string]: any;
}

export interface WelcomeConfig {
  enabled?: boolean;
  useWebsiteTheme?: boolean;
  cardLayout?: string;
  cardAlign?: string;
  textAlign?: string;
  logoAlign?: string;
  avatarAlign?: string;
  cardBg?: string;
  cardBorder?: string;
  cardBorderRadius?: number;
  cardPadding?: string;
  cardBlur?: number;
  cardShadow?: string;
  title?: string;
  titleFontSize?: string;
  description?: string;
  descriptionFontSize?: string;
  bgGradient?: string;
  headerTextColor?: string;
  subtextColor?: string;
  padding?: string;
  footerPaddingBottom?: string;
  avatarBorderColor?: string;
  avatars?: Array<{ name: string; bg?: string; color?: string; url?: string }>;
  buttonText?: string;
  buttonBg?: string;
  buttonTextColor?: string;
  buttonIconColor?: string;
  [key: string]: any;
}

export interface ChatWindowState {
  useWebsiteTheme?: boolean;
  offsetRight?: number | null;
  offsetBottom?: number | null;
  animationOpeningSec?: number;
  animationClosingSec?: number;
  clientName?: string;
  agentName?: string;
  accentColor?: string;
  widgetWidth?: number;
  widgetHeight?: number;
  expandedWidth?: number;
  widgetBorderRadius?: number;
  widgetShadow?: boolean;
  widgetShadowBlur?: number;
  widgetShadowColor?: string;
  widgetBorderEnabled?: boolean;
  widgetBorderWidth?: number;
  widgetBorderColor?: string;
  modernUi?: boolean;
  typingIndicator?: boolean;
  attachmentsEnabled?: boolean;
  prechatEnabled?: boolean;
  postchatEnabled?: boolean;
  ticksEnabled?: boolean;
  sentTickColor?: string;
  deliveredTickColor?: string;
  readTickColor?: string;
  headerBg?: string;
  headerTextColor?: string;
  headerBorderColor?: string;
  headerPadding?: string;
  headerTitleFontSize?: string;
  headerSubtitleFontSize?: string;
  headerAvatarBg?: string;
  headerAvatarColor?: string;
  activeDot?: {
    color?: string;
    animate?: boolean;
    borderWidth?: number;
    borderColor?: string;
    size?: number;
  };
  endChatConfirmMessage?: string;
  endChatConfirmLabel?: string;
  endChatCancelLabel?: string;
  modalCardBg?: string;
  modalMessageColor?: string;
  modalBorderRadius?: number;
  endChatConfirmBg?: string;
  endChatConfirmTextColor?: string;
  endChatCancelBg?: string;
  endChatCancelTextColor?: string;
  endChatCancelBorderColor?: string;
  bodyBg?: string;
  visitorBubbleBg?: string;
  visitorBubbleColor?: string;
  visitorBubbleFontSize?: string;
  visitorBubblePadding?: string;
  visitorBubbleBorderRadius?: string;
  agentBubbleBg?: string;
  agentBubbleColor?: string;
  agentBubbleBorderColor?: string;
  agentBubbleFontSize?: string;
  agentBubblePadding?: string;
  agentBubbleBorderRadius?: string;
  agentAvatarBg?: string;
  agentAvatarColor?: string;
  agentAvatarUrl?: string;
  inputBg?: string;
  inputTextColor?: string;
  inputPlaceholderColor?: string;
  inputBorderColor?: string;
  inputFocusBorderColor?: string;
  inputFocusShadow?: string;
  inputBorderRadius?: string;
  inputPadding?: string;
  inputMargin?: string;
  textareaFontSize?: string;
  attachButtonBg?: string;
  attachButtonColor?: string;
  emojiButtonColor?: string;
  sendButtonBgActive?: string;
  sendButtonColorActive?: string;
  sendButtonBgInactive?: string;
  sendButtonColorInactive?: string;
  sendIconType?: string;
  footerBg?: string;
  footerTextColor?: string;
  footerFontSize?: string;
  footerPaddingBottom?: string;
  poweredByText?: string;
  poweredByLink?: string;
  poweredByColor?: string;
  poweredByLogo?: string;
  welcome?: WelcomeConfig;
  features?: FeaturesState;
  [key: string]: any;
}

export interface FeaturesState {
  /** Master gate: voice/video call UI only shows when these are explicitly enabled. */
  voiceCallEnabled?: boolean;
  videoCallEnabled?: boolean;
  voiceCallMaster?: boolean;
  voiceCallAgents?: boolean;
  voiceCallVisitors?: boolean;
  videoCallMaster?: boolean;
  videoCallAgents?: boolean;
  videoCallVisitors?: boolean;
  disableVisitorCamera?: boolean;
  closeChatVisitor?: boolean;
  averageQueueTime?: number;
  chatAcceptanceTime?: number;
  [key: string]: any;
}

export interface BadgeConfig {
  position?: string;
  offsetX?: number;
  offsetY?: number;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: string;
  fontWeight?: string;
  boxShadow?: string;
  padding?: string;
  animation?: string;
  [key: string]: any;
}

export interface BubbleState {
  useWebsiteTheme: boolean;
  position: string;
  offsetLeft: number;
  offsetRight: number;
  offsetBottom: number;
  stackGap?: number;
  width: number;
  height: number;
  borderRadius: any;
  backgroundColor: string;
  gradientType: string;
  gradientStops: Array<{ color: string; pos: number }>;
  gradientAngle?: number;
  backgroundOverlayType: string;
  backgroundImageUrl: string;
  backgroundImageSize: string;
  backgroundImageOpacity: number;
  backgroundBlendMode: string;
  backgroundLucideIcon?: string;
  backgroundLucideColor?: string;
  backgroundLucideOpacity?: number;
  backgroundLucideSize?: number;
  border: { width: number; color: string; style: string };
  outlineRing: { enabled: boolean; width: number; color: string; opacity: number };
  boxShadowBlur: number;
  boxShadowSpread: number;
  boxShadowOffsetX: number;
  boxShadowOffsetY: number;
  boxShadowOpacity: number;
  innerShadow?: { enabled: boolean; blur: number; opacity: number };
  glass?: { enabled: boolean; blur: number; bgOpacity: number };
  neon?: { enabled: boolean; color: string; intensity: number };
  hoverScale?: number;
  idleAnim?: { enabled: boolean; type: string; amplitude: number; duration: number };
  dots: { color: string; size: number; spacing: number; animation: string };
  iconType?: string;
  iconImageUrl?: string;
  customSvg?: string;
  lucideIcon?: string;
  iconWidth?: number;
  iconHeight?: number;
  iconColor?: string;
  iconFit?: string;
  iconOpacity?: number;
  iconBlend?: string;
  hideOnOpen: boolean;
  tooltip?: {
    enabled: boolean;
    text: string;
    position: string;
    backgroundColor: string;
    textColor: string;
    fontSize: number;
    borderRadius: any;
    padding: string;
    boxShadow: string;
    arrowEnabled: boolean;
    borderColor: string;
    borderWidth: number;
  };
  badge?: BadgeConfig;
  [key: string]: any;
}

export interface InputBoxConfig {
  enabled?: boolean;
  visible?: boolean;
  openingTimeAfterInitialLoadSec?: number;
  animationOpeningSec?: number;
  layout?: string;
  placeholder?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: number;
  boxShadow?: string;
  buttonColor?: string;
  buttonIconColor?: string;
  [key: string]: any;
}

export interface GreetWindowState {
  enabled: boolean;
  dismissed: boolean;
  visible?: boolean;
  openingTimeAfterInitialLoadSec?: number;
  animationOpeningSec?: number;
  animationClosingSec?: number;
  useWebsiteTheme: boolean;
  width: number;
  spacing: number;
  backgroundColor: string;
  borderRadius: number;
  padding: string;
  boxShadow: string;
  imageUrl: string;
  imageHeight: number;
  imageWidth: string;
  iconAlign: string;
  imagePadding: string;
  iconType: string;
  lucideIcon: string;
  iconSize: number;
  iconColor: string;
  iconAnimation: string;
  iconAnimationDuration: string;
  title: string;
  titleColor: string;
  titleFontSize: string;
  description: string;
  descriptionColor: string;
  descriptionFontSize: string;
  position?: string;
  inputBox?: InputBoxConfig;
  [key: string]: any;
}

export interface ChatbarState {
  enabled: boolean;
  useWebsiteTheme: boolean;
  position: string;
  offsetLeft: number;
  offsetRight: number;
  offsetBottom: number;
  stackGap?: number;
  cardOffsetRight?: number | null;
  cardOffsetBottom?: number | null;
  barOffsetRight?: number | null;
  barOffsetBottom?: number | null;
  text: string;
  cardText?: string;
  barText?: string;
  bgColor: string;
  textColor: string;
  textSize: number;
  letterSpacing: number;
  gradientEnabled: boolean;
  gradientStops: Array<{ color: string; pos: number }>;
  gradientType: string;
  gradientAngle: number;
  iconType: string;
  iconColor: string;
  lucideIcon: string;
  iconImageUrl: string;
  iconFit: string;
  iconOpacity: number;
  iconBlend: string;
  iconWidth: number;
  iconHeight: number;
  width: number;
  height: number;
  shadow: boolean;
  borderRadius: any;
  hideOnOpen: boolean;
  layout?: string;
  padding?: string;
  gap?: number;
  buttonBg?: string;
  buttonTextColor?: string;
  buttonText?: string;
  customSvg?: string;
  [key: string]: any;
}

export interface FullStore {
  bubble: BubbleState;
  greetWindow: GreetWindowState;
  chatWindow: ChatWindowState;
  features: FeaturesState;
  chat: ChatState;
  chatbar: ChatbarState;
}
