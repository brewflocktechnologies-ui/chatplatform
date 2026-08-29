import { html } from 'lit';
import '../../components/pages/cw-widget-root.js';

const DEFAULT_ARGS = {
  // 1. Widget & Layout
  clientName: 'Zotly Support',
  agentName: 'Sarah',
  widgetWidth: 380,
  widgetHeight: 620,
  expandedWidth: 550,
  widgetBorderRadius: 28,
  accentColor: '#0b5fff',
  useWebsiteTheme: false,

  // 2. Trigger & Positioning
  triggerType: 'bubble',
  bubbleOffsetRight: 28,
  bubbleOffsetBottom: 12,
  barOffsetRight: 24,
  barOffsetBottom: 16,
  cardOffsetRight: 20,
  cardOffsetBottom: 20,
  bubbleWidth: 60,
  bubbleHeight: 60,
  bubbleHideOnOpen: true,
  bubbleBg: undefined,
  bubbleGradientType: 'none',
  bubbleGradientAngle: 135,
  bubbleGradientStart: '#0b5fff',
  bubbleGradientEnd: '#9333ea',
  bubbleBorderWidth: 0,
  bubbleBorderStyle: 'solid',
  bubbleBorderColor: '#0b5fff',
  bubbleOutlineRingEnabled: false,
  bubbleOutlineRingWidth: 3,
  bubbleOutlineRingColor: '#0b5fff',
  bubbleBoxShadowBlur: 20,
  bubbleBoxShadowOffsetY: 8,
  bubbleBoxShadowOpacity: 0.25,
  bubbleInnerShadowEnabled: false,
  bubbleGlassEnabled: false,
  bubbleGlassBlur: 10,
  bubbleNeonEnabled: false,
  bubbleNeonColor: '#22d3ee',
  bubbleLucideIcon: 'MessageCircle',
  bubbleLucideSize: 28,
  bubbleIconColor: '#ffffff',
  bubbleHoverScale: 1.05,
  bubbleIdleAnimEnabled: false,
  bubbleIdleAnimType: 'bounce',
  bubbleTooltipEnabled: false,
  bubbleTooltipText: 'Chat with us',
  bubbleTooltipPosition: 'left',
  bubbleTooltipBg: '#ffffff',
  bubbleTooltipTextColor: '#374151',
  bubbleBadgePosition: 'top-right',
  bubbleBadgeBg: '#dc2626',
  bubbleBadgeTextColor: '#ffffff',

  // 3. Chatbar Trigger
  chatbarWidth: 255,
  chatbarHeight: 40,
  chatbarBg: undefined,
  chatbarGradientEnabled: false,
  chatbarGradientStart: '#0b5fff',
  chatbarGradientEnd: '#a855f7',
  chatbarBorderRadius: 20,
  chatbarText: 'Chat with us',
  chatcardText: 'Questions about AI solutions?',
  chatbarTextSize: 14,
  chatbarTextColor: '#ffffff',
  chatbarLucideIcon: 'MessageSquare',
  chatbarIconSize: 36,
  chatbarIconColor: '#ffffff',

  // 4. Proactive Greet Window
  enableGreetWindow: false,
  greetTitle: 'Hi there! 👋 Need help growing your business using AI?',
  greetTitleColor: '#1e293b',
  greetTitleFontSize: 15,
  greetDescription: "Let's chat & find the right solution for you!",
  greetDescriptionColor: '#475569',
  greetDescriptionFontSize: 14,
  greetBg: '#ffffff',
  greetWidth: 320,
  greetBorderRadius: 16,
  greetSpacing: 16,
  greetOpeningDelaySec: 2.0,
  greetFadeInSpeedSec: 0.5,
  greetIconType: 'lucide',
  greetIconAlign: 'center',
  greetLucideIcon: 'Sparkles',
  greetIconSize: 52,
  greetIconColor: undefined,
  greetIconAnimation: 'wiggle',
  greetImageUrl: '',
  enableInputCard: true,
  greetInputOpeningDelaySec: 4.0,
  greetInputLayout: 'separated',
  greetInputPlaceholder: 'Write your message...',
  greetInputBg: '#ffffff',
  greetInputTextColor: '#1e293b',
  greetInputBorderRadius: 24,
  greetInputButtonColor: undefined,
  greetInputButtonIconColor: '#ffffff',

  // 5. Welcome Card
  enableWelcomeCard: true,
  welcomeCardLayout: 'glassy',
  welcomeTitle: 'Hi there! 👋 How can we help you today?',
  welcomeDescription: 'Our support heroes are here to assist you.',
  welcomeBgGradient: undefined,
  welcomeButtonText: 'Start Conversation',
  welcomeButtonSubtext: 'Usually replies in a few minutes',
  welcomeButtonBg: undefined,
  welcomeButtonTextColor: '#ffffff',
  welcomeLogoUrl: '',
  welcomeCardBorderRadius: 24,
  welcomeCardBlur: 16,

  // 6. Header & Features
  headerBg: undefined,
  headerTextColor: '#ffffff',
  headerBorderColor: 'rgba(255,255,255,0.15)',
  headerAvatarBg: 'rgba(255,255,255,0.2)',
  headerAvatarColor: '#ffffff',
  activeDotColor: '#22c55e',
  activeDotAnimate: true,
  enableVoiceCall: false,
  enableVideoCall: false,
  enableCloseChatVisitor: true,
  prechatEnabled: false,
  postchatEnabled: false,

  // 7. Messages & Bubbles
  bodyBg: '#f4f4f5',
  visitorBubbleBg: undefined,
  visitorBubbleTextColor: '#ffffff',
  visitorBubbleFontSize: 14,
  visitorBubbleBorderRadius: 16,
  agentBubbleBg: '#ffffff',
  agentBubbleTextColor: '#111827',
  agentBubbleBorderColor: '#d1d5db',
  agentBubbleFontSize: 14,
  agentBubbleBorderRadius: 16,
  agentAvatarBg: undefined,
  agentAvatarColor: '#ffffff',
  agentAvatarUrl: '',

  // 8. Composer & Input
  inputBg: '#ffffff',
  inputTextColor: '#18181b',
  inputPlaceholderColor: '#6b7280',
  inputBorderColor: '#d1d5db',
  inputFocusBorderColor: undefined,
  inputBorderRadius: 24,
  textareaFontSize: 14,
  attachButtonBg: '#ffffff',
  attachButtonColor: '#6b7280',
  emojiButtonColor: '#6b7280',
  sendIconType: 'arrow',
  sendButtonBgActive: undefined,
  sendButtonColorActive: '#ffffff',
  sendButtonBgInactive: '#e5e7eb',
  sendButtonColorInactive: '#9ca3af',
  modernUi: true,
  typingIndicator: true,
  attachmentsEnabled: true,
  ticksEnabled: true,
  sentTickColor: '#a1a1aa',
  readTickColor: '#34b7f1',

  // 9. Footer & Frame
  footerBg: '#f9fafb',
  footerTextColor: '#6b7280',
  poweredByText: 'vainateya.ai',
  poweredByLink: 'https://vainateya.ai',
  poweredByColor: '#0b5fff',
  widgetShadow: true,
  widgetShadowBlur: 20,
  widgetShadowColor: '#000000',
  widgetBorderEnabled: true,
  widgetBorderWidth: 1,
  widgetBorderColor: '#e5e7eb',
  endChatConfirmMessage: 'Are you sure you want to end this conversation?',
  endChatConfirmLabel: 'End chat',
  endChatCancelLabel: 'Cancel',
  modalCardBg: '#ffffff',
  modalMessageColor: '#101828',
  modalBorderRadius: 28,
  endChatConfirmBg: '#0b5fff',
  endChatConfirmTextColor: '#ffffff',
};

export default {
  title: 'Pages/WidgetRoot',
  component: 'cw-widget-root',
  parameters: { layout: 'fullscreen' },
  args: DEFAULT_ARGS,
  argTypes: {
    // 1. Widget & Layout
    clientName: { control: 'text', name: 'Client Name', table: { category: '1. Widget & Layout' } },
    agentName: { control: 'text', name: 'Agent Name', table: { category: '1. Widget & Layout' } },
    widgetWidth: { control: { type: 'range', min: 280, max: 600, step: 5 }, name: 'Widget Width (px)', table: { category: '1. Widget & Layout' } },
    widgetHeight: { control: { type: 'range', min: 400, max: 950, step: 10 }, name: 'Widget Height (px)', table: { category: '1. Widget & Layout' } },
    expandedWidth: { control: { type: 'range', min: 450, max: 800, step: 10 }, name: 'Expanded Width (px)', table: { category: '1. Widget & Layout' } },
    widgetBorderRadius: { control: { type: 'range', min: 0, max: 40, step: 1 }, name: 'Widget Border Radius (px)', table: { category: '1. Widget & Layout' } },
    accentColor: { control: 'color', name: 'Accent Color', table: { category: '1. Widget & Layout' } },
    useWebsiteTheme: { control: 'boolean', name: 'Use Website Theme Colors', table: { category: '1. Widget & Layout' } },

    // 2. Trigger Controls & Positioning
    triggerType: { control: 'select', options: ['bubble', 'chatbar', 'chatcard'], name: 'Trigger Type', table: { category: '2. Trigger & Positioning' } },
    bubbleOffsetRight: { control: { type: 'range', min: 0, max: 100, step: 1 }, name: 'Bubble Offset Right (px)', if: { arg: 'triggerType', eq: 'bubble' }, table: { category: '2. Trigger & Positioning' } },
    bubbleOffsetBottom: { control: { type: 'range', min: 0, max: 100, step: 1 }, name: 'Bubble Offset Bottom (px)', if: { arg: 'triggerType', eq: 'bubble' }, table: { category: '2. Trigger & Positioning' } },
    barOffsetRight: { control: { type: 'range', min: 0, max: 100, step: 1 }, name: 'Chat Bar Offset Right (px)', if: { arg: 'triggerType', neq: 'bubble' }, table: { category: '2. Trigger & Positioning' } },
    barOffsetBottom: { control: { type: 'range', min: 0, max: 100, step: 1 }, name: 'Chat Bar Offset Bottom (px)', if: { arg: 'triggerType', neq: 'bubble' }, table: { category: '2. Trigger & Positioning' } },
    cardOffsetRight: { control: { type: 'range', min: 0, max: 400, step: 1 }, name: 'Chat Card Offset Right (px)', if: { arg: 'triggerType', neq: 'bubble' }, table: { category: '2. Trigger & Positioning' } },
    cardOffsetBottom: { control: { type: 'range', min: 0, max: 100, step: 1 }, name: 'Chat Card Offset Bottom (px)', if: { arg: 'triggerType', neq: 'bubble' }, table: { category: '2. Trigger & Positioning' } },

    // 3. Bubble Trigger Controls
    bubbleWidth: { control: { type: 'number', min: 40, max: 100 }, name: 'Bubble Width (px)', if: { arg: 'triggerType', eq: 'bubble' }, table: { category: '3. Bubble Trigger' } },
    bubbleHeight: { control: { type: 'number', min: 40, max: 100 }, name: 'Bubble Height (px)', if: { arg: 'triggerType', eq: 'bubble' }, table: { category: '3. Bubble Trigger' } },
    bubbleHideOnOpen: { control: 'boolean', name: 'Hide Bubble on Open', if: { arg: 'triggerType', eq: 'bubble' }, table: { category: '3. Bubble Trigger' } },
    bubbleBg: { control: 'color', name: 'Bubble Background Color', if: { arg: 'triggerType', eq: 'bubble' }, table: { category: '3. Bubble Trigger' } },
    bubbleGradientType: { control: 'select', options: ['none', 'linear', 'radial'], name: 'Gradient Type', description: 'Select Linear or Radial to reveal gradient angle and color controls.', if: { arg: 'triggerType', eq: 'bubble' }, table: { category: '3. Bubble Trigger' } },
    bubbleGradientAngle: { control: { type: 'number', min: 0, max: 360 }, name: 'Gradient Angle (deg)', if: { arg: 'bubbleGradientType', neq: 'none' }, table: { category: '3. Bubble Trigger' } },
    bubbleGradientStart: { control: 'color', name: 'Gradient Start Color', if: { arg: 'bubbleGradientType', neq: 'none' }, table: { category: '3. Bubble Trigger' } },
    bubbleGradientEnd: { control: 'color', name: 'Gradient End Color', if: { arg: 'bubbleGradientType', neq: 'none' }, table: { category: '3. Bubble Trigger' } },
    bubbleBorderWidth: { control: { type: 'number', min: 0, max: 10 }, name: 'Border Width (px)', if: { arg: 'triggerType', eq: 'bubble' }, table: { category: '3. Bubble Trigger' } },
    bubbleBorderStyle: { control: 'select', options: ['solid', 'dashed', 'dotted'], name: 'Border Style', if: { arg: 'triggerType', eq: 'bubble' }, table: { category: '3. Bubble Trigger' } },
    bubbleBorderColor: { control: 'color', name: 'Border Color', if: { arg: 'triggerType', eq: 'bubble' }, table: { category: '3. Bubble Trigger' } },
    bubbleOutlineRingEnabled: { control: 'boolean', name: 'Enable Outline Ring', description: 'Turn ON to reveal ring width and color controls.', if: { arg: 'triggerType', eq: 'bubble' }, table: { category: '3. Bubble Trigger' } },
    bubbleOutlineRingWidth: { control: { type: 'number', min: 0, max: 10 }, name: 'Outline Ring Width', if: { arg: 'bubbleOutlineRingEnabled' }, table: { category: '3. Bubble Trigger' } },
    bubbleOutlineRingColor: { control: 'color', name: 'Outline Ring Color', if: { arg: 'bubbleOutlineRingEnabled' }, table: { category: '3. Bubble Trigger' } },
    bubbleBoxShadowBlur: { control: { type: 'number', min: 0, max: 40 }, name: 'Shadow Blur (px)', if: { arg: 'triggerType', eq: 'bubble' }, table: { category: '3. Bubble Trigger' } },
    bubbleBoxShadowOffsetY: { control: { type: 'number', min: 0, max: 20 }, name: 'Shadow Offset Y (px)', if: { arg: 'triggerType', eq: 'bubble' }, table: { category: '3. Bubble Trigger' } },
    bubbleBoxShadowOpacity: { control: { type: 'number', min: 0, max: 1, step: 0.05 }, name: 'Shadow Opacity', if: { arg: 'triggerType', eq: 'bubble' }, table: { category: '3. Bubble Trigger' } },
    bubbleInnerShadowEnabled: { control: 'boolean', name: 'Inner Shadow', if: { arg: 'triggerType', eq: 'bubble' }, table: { category: '3. Bubble Trigger' } },
    bubbleGlassEnabled: { control: 'boolean', name: 'Glassmorphism', description: 'Turn ON to reveal glass blur radius controls.', if: { arg: 'triggerType', eq: 'bubble' }, table: { category: '3. Bubble Trigger' } },
    bubbleGlassBlur: { control: { type: 'number', min: 0, max: 30 }, name: 'Glass Blur Radius', if: { arg: 'bubbleGlassEnabled' }, table: { category: '3. Bubble Trigger' } },
    bubbleNeonEnabled: { control: 'boolean', name: 'Neon Glow', description: 'Turn ON to reveal neon glow color controls.', if: { arg: 'triggerType', eq: 'bubble' }, table: { category: '3. Bubble Trigger' } },
    bubbleNeonColor: { control: 'color', name: 'Neon Color', if: { arg: 'bubbleNeonEnabled' }, table: { category: '3. Bubble Trigger' } },
    bubbleLucideIcon: { control: 'text', name: 'Bubble Icon', if: { arg: 'triggerType', eq: 'bubble' }, table: { category: '3. Bubble Trigger' } },
    bubbleLucideSize: { control: { type: 'number', min: 12, max: 48 }, name: 'Icon Size (px)', if: { arg: 'triggerType', eq: 'bubble' }, table: { category: '3. Bubble Trigger' } },
    bubbleIconColor: { control: 'color', name: 'Bubble Icon Color', if: { arg: 'triggerType', eq: 'bubble' }, table: { category: '3. Bubble Trigger' } },
    bubbleHoverScale: { control: { type: 'number', min: 0.8, max: 1.5, step: 0.05 }, name: 'Hover Scale Factor', if: { arg: 'triggerType', eq: 'bubble' }, table: { category: '3. Bubble Trigger' } },
    bubbleIdleAnimEnabled: { control: 'boolean', name: 'Idle Loop Animation', description: 'Turn ON to reveal idle animation style options.', if: { arg: 'triggerType', eq: 'bubble' }, table: { category: '3. Bubble Trigger' } },
    bubbleIdleAnimType: { control: 'select', options: ['none', 'bounce', 'pulse', 'float'], name: 'Idle Anim Style', if: { arg: 'bubbleIdleAnimEnabled' }, table: { category: '3. Bubble Trigger' } },
    bubbleTooltipEnabled: { control: 'boolean', name: 'Hover Tooltip Enabled', description: 'Turn ON to reveal tooltip text, position, and color controls.', if: { arg: 'triggerType', eq: 'bubble' }, table: { category: '3. Bubble Trigger' } },
    bubbleTooltipText: { control: 'text', name: 'Tooltip Text', if: { arg: 'bubbleTooltipEnabled' }, table: { category: '3. Bubble Trigger' } },
    bubbleTooltipPosition: { control: 'select', options: ['left', 'top', 'right'], name: 'Tooltip Position', if: { arg: 'bubbleTooltipEnabled' }, table: { category: '3. Bubble Trigger' } },
    bubbleTooltipBg: { control: 'color', name: 'Tooltip Background Color', if: { arg: 'bubbleTooltipEnabled' }, table: { category: '3. Bubble Trigger' } },
    bubbleTooltipTextColor: { control: 'color', name: 'Tooltip Text Color', if: { arg: 'bubbleTooltipEnabled' }, table: { category: '3. Bubble Trigger' } },
    bubbleBadgePosition: { control: 'select', options: ['top-right', 'top-left', 'bottom-right'], name: 'Badge Position', if: { arg: 'triggerType', eq: 'bubble' }, table: { category: '3. Bubble Trigger' } },
    bubbleBadgeBg: { control: 'color', name: 'Badge Background Color', if: { arg: 'triggerType', eq: 'bubble' }, table: { category: '3. Bubble Trigger' } },
    bubbleBadgeTextColor: { control: 'color', name: 'Badge Text Color', if: { arg: 'triggerType', eq: 'bubble' }, table: { category: '3. Bubble Trigger' } },

    // 4. Chatbar Trigger Layout
    chatbarWidth: { control: { type: 'number', min: 150, max: 400 }, name: 'Chatbar Width (px)', if: { arg: 'triggerType', neq: 'bubble' }, table: { category: '4. Chatbar Trigger' } },
    chatbarHeight: { control: { type: 'number', min: 30, max: 80 }, name: 'Chatbar Height (px)', if: { arg: 'triggerType', neq: 'bubble' }, table: { category: '4. Chatbar Trigger' } },
    chatbarBg: { control: 'color', name: 'Chatbar Background', if: { arg: 'triggerType', neq: 'bubble' }, table: { category: '4. Chatbar Trigger' } },
    chatbarGradientEnabled: { control: 'boolean', name: 'Gradient Fill', description: 'Turn ON to reveal gradient start and end color controls.', if: { arg: 'triggerType', neq: 'bubble' }, table: { category: '4. Chatbar Trigger' } },
    chatbarGradientStart: { control: 'color', name: 'Gradient Start Color', if: { arg: 'chatbarGradientEnabled' }, table: { category: '4. Chatbar Trigger' } },
    chatbarGradientEnd: { control: 'color', name: 'Gradient End Color', if: { arg: 'chatbarGradientEnabled' }, table: { category: '4. Chatbar Trigger' } },
    chatbarBorderRadius: { control: { type: 'number', min: 0, max: 40 }, name: 'Corner Radius (px)', if: { arg: 'triggerType', neq: 'bubble' }, table: { category: '4. Chatbar Trigger' } },
    chatbarText: { control: 'text', name: 'Chatbar Bar Text', if: { arg: 'triggerType', neq: 'bubble' }, table: { category: '4. Chatbar Trigger' } },
    chatcardText: { control: 'text', name: 'Chatcard Message Text', if: { arg: 'triggerType', neq: 'bubble' }, table: { category: '4. Chatbar Trigger' } },
    chatbarTextSize: { control: { type: 'number', min: 10, max: 20 }, name: 'Text Size (px)', if: { arg: 'triggerType', neq: 'bubble' }, table: { category: '4. Chatbar Trigger' } },
    chatbarTextColor: { control: 'color', name: 'Text Color', if: { arg: 'triggerType', neq: 'bubble' }, table: { category: '4. Chatbar Trigger' } },
    chatbarLucideIcon: { control: 'text', name: 'Icon Symbol', if: { arg: 'triggerType', neq: 'bubble' }, table: { category: '4. Chatbar Trigger' } },
    chatbarIconSize: { control: { type: 'number', min: 14, max: 64 }, name: 'Icon Size (px)', if: { arg: 'triggerType', neq: 'bubble' }, table: { category: '4. Chatbar Trigger' } },
    chatbarIconColor: { control: 'color', name: 'Icon Color', if: { arg: 'triggerType', neq: 'bubble' }, table: { category: '4. Chatbar Trigger' } },

    // 5. Proactive Greet Window
    enableGreetWindow: { control: 'boolean', name: 'Enable Greet Window', description: 'Turn ON to reveal all greet window title, card style, media, and reply bar controls.', table: { category: '5. Proactive Greet Window' } },
    greetTitle: { control: 'text', name: 'Headline Title', if: { arg: 'enableGreetWindow' }, table: { category: '5. Proactive Greet Window' } },
    greetTitleColor: { control: 'color', name: 'Headline Color', if: { arg: 'enableGreetWindow' }, table: { category: '5. Proactive Greet Window' } },
    greetTitleFontSize: { control: { type: 'number', min: 12, max: 24 }, name: 'Headline Font Size (px)', if: { arg: 'enableGreetWindow' }, table: { category: '5. Proactive Greet Window' } },
    greetDescription: { control: 'text', name: 'Sub-Greeting Message', if: { arg: 'enableGreetWindow' }, table: { category: '5. Proactive Greet Window' } },
    greetDescriptionColor: { control: 'color', name: 'Sub-Greeting Color', if: { arg: 'enableGreetWindow' }, table: { category: '5. Proactive Greet Window' } },
    greetDescriptionFontSize: { control: { type: 'number', min: 11, max: 20 }, name: 'Sub-Greeting Font Size (px)', if: { arg: 'enableGreetWindow' }, table: { category: '5. Proactive Greet Window' } },
    greetBg: { control: 'color', name: 'Card Background Color', if: { arg: 'enableGreetWindow' }, table: { category: '5. Proactive Greet Window' } },
    greetWidth: { control: { type: 'number', min: 240, max: 450 }, name: 'Card Width (px)', if: { arg: 'enableGreetWindow' }, table: { category: '5. Proactive Greet Window' } },
    greetBorderRadius: { control: { type: 'number', min: 0, max: 32 }, name: 'Corner Radius (px)', if: { arg: 'enableGreetWindow' }, table: { category: '5. Proactive Greet Window' } },
    greetSpacing: { control: { type: 'number', min: 0, max: 40 }, name: 'Bottom Clearance (px)', if: { arg: 'enableGreetWindow' }, table: { category: '5. Proactive Greet Window' } },
    greetOpeningDelaySec: { control: { type: 'number', min: 0, max: 10, step: 0.5 }, name: 'Opening Delay (s)', if: { arg: 'enableGreetWindow' }, table: { category: '5. Proactive Greet Window' } },
    greetFadeInSpeedSec: { control: { type: 'number', min: 0.1, max: 2, step: 0.1 }, name: 'Fade In Speed (s)', if: { arg: 'enableGreetWindow' }, table: { category: '5. Proactive Greet Window' } },
    greetIconType: { control: 'select', options: ['lucide', 'image', 'customSvg'], name: 'Header Media Type', if: { arg: 'enableGreetWindow' }, table: { category: '5. Proactive Greet Window' } },
    greetIconAlign: { control: 'select', options: ['center', 'left', 'right'], name: 'Media Alignment', if: { arg: 'enableGreetWindow' }, table: { category: '5. Proactive Greet Window' } },
    greetLucideIcon: { control: 'text', name: 'Lucide Icon Name', if: { arg: 'enableGreetWindow' }, table: { category: '5. Proactive Greet Window' } },
    greetIconSize: { control: { type: 'number', min: 20, max: 80 }, name: 'Icon Size (px)', if: { arg: 'enableGreetWindow' }, table: { category: '5. Proactive Greet Window' } },
    greetIconColor: { control: 'color', name: 'Icon Color', if: { arg: 'enableGreetWindow' }, table: { category: '5. Proactive Greet Window' } },
    greetIconAnimation: { control: 'select', options: ['none', 'wiggle', 'pulse', 'bounce'], name: 'Icon Motion Loop', if: { arg: 'enableGreetWindow' }, table: { category: '5. Proactive Greet Window' } },
    greetImageUrl: { control: 'text', name: 'Custom Image Web URL', if: { arg: 'enableGreetWindow' }, table: { category: '5. Proactive Greet Window' } },
    enableInputCard: { control: 'boolean', name: 'Enable Quick Reply Bar', description: 'Turn ON to reveal quick reply bar placeholder, color, and layout controls.', if: { arg: 'enableGreetWindow' }, table: { category: '5. Proactive Greet Window' } },
    greetInputOpeningDelaySec: { control: { type: 'number', min: 0, max: 10, step: 0.5 }, name: 'Reply Bar Delay (s)', if: { arg: 'enableGreetWindow' }, table: { category: '5. Proactive Greet Window' } },
    greetInputLayout: { control: 'select', options: ['separated', 'integrated'], name: 'Reply Bar Layout', if: { arg: 'enableGreetWindow' }, table: { category: '5. Proactive Greet Window' } },
    greetInputPlaceholder: { control: 'text', name: 'Placeholder Prompt', if: { arg: 'enableGreetWindow' }, table: { category: '5. Proactive Greet Window' } },
    greetInputBg: { control: 'color', name: 'Reply Bar Fill Color', if: { arg: 'enableGreetWindow' }, table: { category: '5. Proactive Greet Window' } },
    greetInputTextColor: { control: 'color', name: 'Typed Text Color', if: { arg: 'enableGreetWindow' }, table: { category: '5. Proactive Greet Window' } },
    greetInputBorderRadius: { control: { type: 'number', min: 0, max: 30 }, name: 'Reply Bar Radius (px)', if: { arg: 'enableGreetWindow' }, table: { category: '5. Proactive Greet Window' } },
    greetInputButtonColor: { control: 'color', name: 'Action Button Fill', if: { arg: 'enableGreetWindow' }, table: { category: '5. Proactive Greet Window' } },
    greetInputButtonIconColor: { control: 'color', name: 'Action Button Icon Color', if: { arg: 'enableGreetWindow' }, table: { category: '5. Proactive Greet Window' } },

    // 6. Welcome Dashboard Card
    enableWelcomeCard: { control: 'boolean', name: 'Enable Welcome Card', description: 'Turn ON to reveal welcome card layout, title, gradient, and action button controls.', table: { category: '6. Welcome Card' } },
    welcomeCardLayout: { control: 'select', options: ['glassy', 'normal'], name: 'Card Layout Style', if: { arg: 'enableWelcomeCard' }, table: { category: '6. Welcome Card' } },
    welcomeTitle: { control: 'text', name: 'Headline Title', if: { arg: 'enableWelcomeCard' }, table: { category: '6. Welcome Card' } },
    welcomeDescription: { control: 'text', name: 'Subtitle Description', if: { arg: 'enableWelcomeCard' }, table: { category: '6. Welcome Card' } },
    welcomeBgGradient: { control: 'text', name: 'Background Gradient CSS', if: { arg: 'enableWelcomeCard' }, table: { category: '6. Welcome Card' } },
    welcomeButtonText: { control: 'text', name: 'Primary Button Label', if: { arg: 'enableWelcomeCard' }, table: { category: '6. Welcome Card' } },
    welcomeButtonSubtext: { control: 'text', name: 'Primary Button Subtext', if: { arg: 'enableWelcomeCard' }, table: { category: '6. Welcome Card' } },
    welcomeButtonBg: { control: 'color', name: 'Primary Button Fill', if: { arg: 'enableWelcomeCard' }, table: { category: '6. Welcome Card' } },
    welcomeButtonTextColor: { control: 'color', name: 'Primary Button Text Color', if: { arg: 'enableWelcomeCard' }, table: { category: '6. Welcome Card' } },
    welcomeLogoUrl: { control: 'text', name: 'Brand Logo URL', if: { arg: 'enableWelcomeCard' }, table: { category: '6. Welcome Card' } },
    welcomeCardBorderRadius: { control: { type: 'number', min: 0, max: 40 }, name: 'Corner Radius (px)', if: { arg: 'enableWelcomeCard' }, table: { category: '6. Welcome Card' } },
    welcomeCardBlur: { control: { type: 'number', min: 0, max: 30 }, name: 'Glass Blur Radius (px)', if: { arg: 'enableWelcomeCard' }, table: { category: '6. Welcome Card' } },

    // 7. Header & Features
    headerBg: { control: 'color', name: 'Header Background', table: { category: '7. Header & Features' } },
    headerTextColor: { control: 'color', name: 'Header Text Color', table: { category: '7. Header & Features' } },
    headerBorderColor: { control: 'color', name: 'Header Divider Line Color', table: { category: '7. Header & Features' } },
    headerAvatarBg: { control: 'color', name: 'Header Avatar Background', table: { category: '7. Header & Features' } },
    headerAvatarColor: { control: 'color', name: 'Header Avatar Text Color', table: { category: '7. Header & Features' } },
    activeDotColor: { control: 'color', name: 'Online Dot Color', table: { category: '7. Header & Features' } },
    activeDotAnimate: { control: 'boolean', name: 'Online Dot Pulsing', table: { category: '7. Header & Features' } },
    enableVoiceCall: { control: 'boolean', name: 'Enable Voice Call Action', table: { category: '7. Header & Features' } },
    enableVideoCall: { control: 'boolean', name: 'Enable Video Call Action', table: { category: '7. Header & Features' } },
    enableCloseChatVisitor: { control: 'boolean', name: 'Enable Close Action', table: { category: '7. Header & Features' } },
    prechatEnabled: { control: 'boolean', name: 'Enable Pre-Chat Form (Turn ON to require pre-chat details)', table: { category: '7. Header & Features' } },
    postchatEnabled: { control: 'boolean', name: 'Enable Post-Chat Feedback (Turn ON to request rating on end)', table: { category: '7. Header & Features' } },

    // 8. Messages & Bubbles
    bodyBg: { control: 'color', name: 'Chat Body Background', table: { category: '8. Messages & Bubbles' } },
    visitorBubbleBg: { control: 'color', name: 'Visitor Bubble Fill Color', table: { category: '8. Messages & Bubbles' } },
    visitorBubbleTextColor: { control: 'color', name: 'Visitor Bubble Text Color', table: { category: '8. Messages & Bubbles' } },
    visitorBubbleFontSize: { control: { type: 'number', min: 11, max: 20 }, name: 'Visitor Text Size (px)', table: { category: '8. Messages & Bubbles' } },
    visitorBubbleBorderRadius: { control: { type: 'number', min: 0, max: 30 }, name: 'Visitor Corner Radius (px)', table: { category: '8. Messages & Bubbles' } },
    agentBubbleBg: { control: 'color', name: 'Agent Bubble Fill Color', table: { category: '8. Messages & Bubbles' } },
    agentBubbleTextColor: { control: 'color', name: 'Agent Bubble Text Color', table: { category: '8. Messages & Bubbles' } },
    agentBubbleBorderColor: { control: 'color', name: 'Agent Bubble Border Color', table: { category: '8. Messages & Bubbles' } },
    agentBubbleFontSize: { control: { type: 'number', min: 11, max: 20 }, name: 'Agent Text Size (px)', table: { category: '8. Messages & Bubbles' } },
    agentBubbleBorderRadius: { control: { type: 'number', min: 0, max: 30 }, name: 'Agent Corner Radius (px)', table: { category: '8. Messages & Bubbles' } },
    agentAvatarBg: { control: 'color', name: 'Agent Avatar Fill', table: { category: '8. Messages & Bubbles' } },
    agentAvatarColor: { control: 'color', name: 'Agent Avatar Text Color', table: { category: '8. Messages & Bubbles' } },
    agentAvatarUrl: { control: 'text', name: 'Agent Avatar Photo URL', table: { category: '8. Messages & Bubbles' } },

    // 9. Composer & Input Field Controls
    inputBg: { control: 'color', name: 'Input Box Fill Color', table: { category: '9. Composer & Input' } },
    inputTextColor: { control: 'color', name: 'Typed Text Color', table: { category: '9. Composer & Input' } },
    inputPlaceholderColor: { control: 'color', name: 'Hint Placeholder Color', table: { category: '9. Composer & Input' } },
    inputBorderColor: { control: 'color', name: 'Input Border Color', table: { category: '9. Composer & Input' } },
    inputFocusBorderColor: { control: 'color', name: 'Focused Border Glow Color', table: { category: '9. Composer & Input' } },
    inputBorderRadius: { control: { type: 'number', min: 0, max: 40 }, name: 'Input Corner Radius (px)', table: { category: '9. Composer & Input' } },
    textareaFontSize: { control: { type: 'number', min: 11, max: 20 }, name: 'Input Text Size (px)', table: { category: '9. Composer & Input' } },
    attachButtonBg: { control: 'color', name: 'Attach Button Background', table: { category: '9. Composer & Input' } },
    attachButtonColor: { control: 'color', name: 'Attach Button Icon Color', table: { category: '9. Composer & Input' } },
    emojiButtonColor: { control: 'color', name: 'Emoji Button Icon Color', table: { category: '9. Composer & Input' } },
    sendIconType: { control: 'select', options: ['arrow', 'send'], name: 'Send Button Icon Style', table: { category: '9. Composer & Input' } },
    sendButtonBgActive: { control: 'color', name: 'Send Button Active Fill', table: { category: '9. Composer & Input' } },
    sendButtonColorActive: { control: 'color', name: 'Send Button Active Icon Color', table: { category: '9. Composer & Input' } },
    sendButtonBgInactive: { control: 'color', name: 'Send Button Inactive Fill', table: { category: '9. Composer & Input' } },
    sendButtonColorInactive: { control: 'color', name: 'Send Button Inactive Icon Color', table: { category: '9. Composer & Input' } },
    modernUi: { control: 'boolean', name: 'Enable Modern UI & Emoji Picker', table: { category: '9. Composer & Input' } },
    typingIndicator: { control: 'boolean', name: 'Show Typing Dots Indicator', table: { category: '9. Composer & Input' } },
    attachmentsEnabled: { control: 'boolean', name: 'Enable Attachment Uploads', table: { category: '9. Composer & Input' } },
    ticksEnabled: { control: 'boolean', name: 'Enable Delivery Tick Marks', description: 'Turn ON to reveal sent and read tick mark color controls.', table: { category: '9. Composer & Input' } },
    sentTickColor: { control: 'color', name: 'Sent Tick Color', if: { arg: 'ticksEnabled' }, table: { category: '9. Composer & Input' } },
    readTickColor: { control: 'color', name: 'Read Tick Color', if: { arg: 'ticksEnabled' }, table: { category: '9. Composer & Input' } },

    // 10. Footer, Frame & Confirmation Modal
    footerBg: { control: 'color', name: 'Footer Bar Fill Color', table: { category: '10. Footer & Frame' } },
    footerTextColor: { control: 'color', name: 'Footer Text Color', table: { category: '10. Footer & Frame' } },
    poweredByText: { control: 'text', name: 'Branding Label', table: { category: '10. Footer & Frame' } },
    poweredByLink: { control: 'text', name: 'Branding Link URL', table: { category: '10. Footer & Frame' } },
    poweredByColor: { control: 'color', name: 'Branding Link Color', table: { category: '10. Footer & Frame' } },
    widgetShadow: { control: 'boolean', name: 'Window Drop Shadow', description: 'Turn ON to reveal shadow blur and color controls.', table: { category: '10. Footer & Frame' } },
    widgetShadowBlur: { control: { type: 'number', min: 0, max: 50 }, name: 'Window Shadow Blur (px)', if: { arg: 'widgetShadow' }, table: { category: '10. Footer & Frame' } },
    widgetShadowColor: { control: 'color', name: 'Window Shadow Color', if: { arg: 'widgetShadow' }, table: { category: '10. Footer & Frame' } },
    widgetBorderEnabled: { control: 'boolean', name: 'Window Frame Border', description: 'Turn ON to reveal frame border width and color controls.', table: { category: '10. Footer & Frame' } },
    widgetBorderWidth: { control: { type: 'number', min: 0, max: 10 }, name: 'Frame Border Width (px)', if: { arg: 'widgetBorderEnabled' }, table: { category: '10. Footer & Frame' } },
    widgetBorderColor: { control: 'color', name: 'Frame Border Color', if: { arg: 'widgetBorderEnabled' }, table: { category: '10. Footer & Frame' } },
    endChatConfirmMessage: { control: 'text', name: 'End Chat Modal Message', table: { category: '10. Footer & Frame' } },
    endChatConfirmLabel: { control: 'text', name: 'Confirm Button Label', table: { category: '10. Footer & Frame' } },
    endChatCancelLabel: { control: 'text', name: 'Cancel Button Label', table: { category: '10. Footer & Frame' } },
    modalCardBg: { control: 'color', name: 'Modal Card Fill Color', table: { category: '10. Footer & Frame' } },
    modalMessageColor: { control: 'color', name: 'Modal Message Text Color', table: { category: '10. Footer & Frame' } },
    modalBorderRadius: { control: { type: 'number', min: 0, max: 40 }, name: 'Modal Corner Radius (px)', table: { category: '10. Footer & Frame' } },
    endChatConfirmBg: { control: 'color', name: 'Confirm Button Fill Color', table: { category: '10. Footer & Frame' } },
    endChatConfirmTextColor: { control: 'color', name: 'Confirm Button Text Color', table: { category: '10. Footer & Frame' } },
  },
};

const renderWidget = (args: any) => html`
  <div style="position: relative; width: 100%; height: 100vh; max-height: 100vh; overflow: hidden; box-sizing: border-box;">
    <cw-widget-root
      .clientName="${args.clientName}"
      .agentName="${args.agentName}"
      .widgetWidth="${args.widgetWidth}"
      .widgetHeight="${args.widgetHeight}"
      .expandedWidth="${args.expandedWidth}"
      .widgetBorderRadius="${args.widgetBorderRadius}"
      .accentColor="${args.accentColor}"
      .useWebsiteTheme="${args.useWebsiteTheme}"

      .triggerType="${args.triggerType}"
      .bubbleOffsetRight="${args.bubbleOffsetRight}"
      .bubbleOffsetBottom="${args.bubbleOffsetBottom}"
      .barOffsetRight="${args.barOffsetRight}"
      .barOffsetBottom="${args.barOffsetBottom}"
      .cardOffsetRight="${args.cardOffsetRight}"
      .cardOffsetBottom="${args.cardOffsetBottom}"
      .bubbleWidth="${args.bubbleWidth}"
      .bubbleHeight="${args.bubbleHeight}"
      .bubbleHideOnOpen="${args.bubbleHideOnOpen}"
      .bubbleBg="${args.bubbleBg}"
      .bubbleGradientType="${args.bubbleGradientType}"
      .bubbleGradientAngle="${args.bubbleGradientAngle}"
      .bubbleGradientStart="${args.bubbleGradientStart}"
      .bubbleGradientEnd="${args.bubbleGradientEnd}"
      .bubbleBorderWidth="${args.bubbleBorderWidth}"
      .bubbleBorderStyle="${args.bubbleBorderStyle}"
      .bubbleBorderColor="${args.bubbleBorderColor}"
      .bubbleOutlineRingEnabled="${args.bubbleOutlineRingEnabled}"
      .bubbleOutlineRingWidth="${args.bubbleOutlineRingWidth}"
      .bubbleOutlineRingColor="${args.bubbleOutlineRingColor}"
      .bubbleBoxShadowBlur="${args.bubbleBoxShadowBlur}"
      .bubbleBoxShadowOffsetY="${args.bubbleBoxShadowOffsetY}"
      .bubbleBoxShadowOpacity="${args.bubbleBoxShadowOpacity}"
      .bubbleInnerShadowEnabled="${args.bubbleInnerShadowEnabled}"
      .bubbleGlassEnabled="${args.bubbleGlassEnabled}"
      .bubbleGlassBlur="${args.bubbleGlassBlur}"
      .bubbleNeonEnabled="${args.bubbleNeonEnabled}"
      .bubbleNeonColor="${args.bubbleNeonColor}"
      .bubbleLucideIcon="${args.bubbleLucideIcon}"
      .bubbleLucideSize="${args.bubbleLucideSize}"
      .bubbleIconColor="${args.bubbleIconColor}"
      .bubbleHoverScale="${args.bubbleHoverScale}"
      .bubbleIdleAnimEnabled="${args.bubbleIdleAnimEnabled}"
      .bubbleIdleAnimType="${args.bubbleIdleAnimType}"
      .bubbleTooltipEnabled="${args.bubbleTooltipEnabled}"
      .bubbleTooltipText="${args.bubbleTooltipText}"
      .bubbleTooltipPosition="${args.bubbleTooltipPosition}"
      .bubbleTooltipBg="${args.bubbleTooltipBg}"
      .bubbleTooltipTextColor="${args.bubbleTooltipTextColor}"
      .bubbleBadgePosition="${args.bubbleBadgePosition}"
      .bubbleBadgeBg="${args.bubbleBadgeBg}"
      .bubbleBadgeTextColor="${args.bubbleBadgeTextColor}"

      .chatbarWidth="${args.chatbarWidth}"
      .chatbarHeight="${args.chatbarHeight}"
      .chatbarBg="${args.chatbarBg}"
      .chatbarGradientEnabled="${args.chatbarGradientEnabled}"
      .chatbarGradientStart="${args.chatbarGradientStart}"
      .chatbarGradientEnd="${args.chatbarGradientEnd}"
      .chatbarBorderRadius="${args.chatbarBorderRadius}"
      .chatbarText="${args.chatbarText}"
      .chatcardText="${args.chatcardText}"
      .chatbarTextSize="${args.chatbarTextSize}"
      .chatbarTextColor="${args.chatbarTextColor}"
      .chatbarLucideIcon="${args.chatbarLucideIcon}"
      .chatbarIconSize="${args.chatbarIconSize}"
      .chatbarIconColor="${args.chatbarIconColor}"

      .enableGreetWindow="${args.enableGreetWindow}"
      .greetTitle="${args.greetTitle}"
      .greetTitleColor="${args.greetTitleColor}"
      .greetTitleFontSize="${args.greetTitleFontSize}"
      .greetDescription="${args.greetDescription}"
      .greetDescriptionColor="${args.greetDescriptionColor}"
      .greetDescriptionFontSize="${args.greetDescriptionFontSize}"
      .greetBg="${args.greetBg}"
      .greetWidth="${args.greetWidth}"
      .greetBorderRadius="${args.greetBorderRadius}"
      .greetSpacing="${args.greetSpacing}"
      .greetOpeningDelaySec="${args.greetOpeningDelaySec}"
      .greetFadeInSpeedSec="${args.greetFadeInSpeedSec}"
      .greetIconType="${args.greetIconType}"
      .greetIconAlign="${args.greetIconAlign}"
      .greetLucideIcon="${args.greetLucideIcon}"
      .greetIconSize="${args.greetIconSize}"
      .greetIconColor="${args.greetIconColor}"
      .greetIconAnimation="${args.greetIconAnimation}"
      .greetImageUrl="${args.greetImageUrl}"
      .enableInputCard="${args.enableInputCard}"
      .greetInputOpeningDelaySec="${args.greetInputOpeningDelaySec}"
      .greetInputLayout="${args.greetInputLayout}"
      .greetInputPlaceholder="${args.greetInputPlaceholder}"
      .greetInputBg="${args.greetInputBg}"
      .greetInputTextColor="${args.greetInputTextColor}"
      .greetInputBorderRadius="${args.greetInputBorderRadius}"
      .greetInputButtonColor="${args.greetInputButtonColor}"
      .greetInputButtonIconColor="${args.greetInputButtonIconColor}"

      .enableWelcomeCard="${args.enableWelcomeCard}"
      .welcomeCardLayout="${args.welcomeCardLayout}"
      .welcomeTitle="${args.welcomeTitle}"
      .welcomeDescription="${args.welcomeDescription}"
      .welcomeBgGradient="${args.welcomeBgGradient}"
      .welcomeButtonText="${args.welcomeButtonText}"
      .welcomeButtonSubtext="${args.welcomeButtonSubtext}"
      .welcomeButtonBg="${args.welcomeButtonBg}"
      .welcomeButtonTextColor="${args.welcomeButtonTextColor}"
      .welcomeLogoUrl="${args.welcomeLogoUrl}"
      .welcomeCardBorderRadius="${args.welcomeCardBorderRadius}"
      .welcomeCardBlur="${args.welcomeCardBlur}"

      .headerBg="${args.headerBg}"
      .headerTextColor="${args.headerTextColor}"
      .headerBorderColor="${args.headerBorderColor}"
      .headerAvatarBg="${args.headerAvatarBg}"
      .headerAvatarColor="${args.headerAvatarColor}"
      .activeDotColor="${args.activeDotColor}"
      .activeDotAnimate="${args.activeDotAnimate}"
      .enableVoiceCall="${args.enableVoiceCall}"
      .enableVideoCall="${args.enableVideoCall}"
      .enableCloseChatVisitor="${args.enableCloseChatVisitor}"
      .prechatEnabled="${args.prechatEnabled}"
      .postchatEnabled="${args.postchatEnabled}"

      .bodyBg="${args.bodyBg}"
      .visitorBubbleBg="${args.visitorBubbleBg}"
      .visitorBubbleTextColor="${args.visitorBubbleTextColor}"
      .visitorBubbleFontSize="${args.visitorBubbleFontSize}"
      .visitorBubbleBorderRadius="${args.visitorBubbleBorderRadius}"
      .agentBubbleBg="${args.agentBubbleBg}"
      .agentBubbleTextColor="${args.agentBubbleTextColor}"
      .agentBubbleBorderColor="${args.agentBubbleBorderColor}"
      .agentBubbleFontSize="${args.agentBubbleFontSize}"
      .agentBubbleBorderRadius="${args.agentBubbleBorderRadius}"
      .agentAvatarBg="${args.agentAvatarBg}"
      .agentAvatarColor="${args.agentAvatarColor}"
      .agentAvatarUrl="${args.agentAvatarUrl}"

      .inputBg="${args.inputBg}"
      .inputTextColor="${args.inputTextColor}"
      .inputPlaceholderColor="${args.inputPlaceholderColor}"
      .inputBorderColor="${args.inputBorderColor}"
      .inputFocusBorderColor="${args.inputFocusBorderColor}"
      .inputBorderRadius="${args.inputBorderRadius}"
      .textareaFontSize="${args.textareaFontSize}"
      .attachButtonBg="${args.attachButtonBg}"
      .attachButtonColor="${args.attachButtonColor}"
      .emojiButtonColor="${args.emojiButtonColor}"
      .sendIconType="${args.sendIconType}"
      .sendButtonBgActive="${args.sendButtonBgActive}"
      .sendButtonColorActive="${args.sendButtonColorActive}"
      .sendButtonBgInactive="${args.sendButtonBgInactive}"
      .sendButtonColorInactive="${args.sendButtonColorInactive}"
      .modernUi="${args.modernUi}"
      .typingIndicator="${args.typingIndicator}"
      .attachmentsEnabled="${args.attachmentsEnabled}"
      .ticksEnabled="${args.ticksEnabled}"
      .sentTickColor="${args.sentTickColor}"
      .readTickColor="${args.readTickColor}"

      .footerBg="${args.footerBg}"
      .footerTextColor="${args.footerTextColor}"
      .poweredByText="${args.poweredByText}"
      .poweredByLink="${args.poweredByLink}"
      .poweredByColor="${args.poweredByColor}"
      .widgetShadow="${args.widgetShadow}"
      .widgetShadowBlur="${args.widgetShadowBlur}"
      .widgetShadowColor="${args.widgetShadowColor}"
      .widgetBorderEnabled="${args.widgetBorderEnabled}"
      .widgetBorderWidth="${args.widgetBorderWidth}"
      .widgetBorderColor="${args.widgetBorderColor}"
      .endChatConfirmMessage="${args.endChatConfirmMessage}"
      .endChatConfirmLabel="${args.endChatConfirmLabel}"
      .endChatCancelLabel="${args.endChatCancelLabel}"
      .modalCardBg="${args.modalCardBg}"
      .modalMessageColor="${args.modalMessageColor}"
      .modalBorderRadius="${args.modalBorderRadius}"
      .endChatConfirmBg="${args.endChatConfirmBg}"
      .endChatConfirmTextColor="${args.endChatConfirmTextColor}"
    ></cw-widget-root>
  </div>
`;

export const Default = {
  args:{
    ...DEFAULT_ARGS,
    enableGreetWindow:true,
    enableInputCard:true,
    greetOpeningDelaySec:2.0,
    greetInputOpeningDelaySec:4.0,
    bubbleTooltipEnabled:true,
    welcomeButtonTextColor:"#000000",
    widgetShadow:false,
    triggerType:"bubble",
    cardOffsetRight:179
  },
  render:renderWidget,
};

