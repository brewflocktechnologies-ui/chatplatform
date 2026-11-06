import type {
  BubbleState,
  ChatbarState,
  GreetWindowState,
  ChatWindowState,
  FeaturesState,
} from '../store/types.js';
import { CHATBAR_BAR_PRESET, CHATBAR_CARD_PRESET } from './chatbar-presets.js';
import { getParentTheme } from '../utils/theme.js';
import { legibleOn } from '../utils/style-helpers.js';

export function createAccentGradient(hex: string): string {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) {
    return `linear-gradient(135deg, ${hex || '#0b5fff'}, #0284c7)`;
  }
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  if (c.length !== 6) return `linear-gradient(135deg, ${hex}, ${hex})`;

  let r = Number.parseInt(c.substring(0, 2), 16) / 255;
  let g = Number.parseInt(c.substring(2, 4), 16) / 255;
  let b = Number.parseInt(c.substring(4, 6), 16) / 255;

  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  let h2 = ((h * 360 + 25) % 360) / 360;
  let s2 = Math.min(1, s * 1.05);
  let l2 = Math.max(0.15, Math.min(0.85, l * 0.82));

  const q = l2 < 0.5 ? l2 * (1 + s2) : l2 + s2 - l2 * s2;
  const p = 2 * l2 - q;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  const r2 = hue2rgb(p, q, h2 + 1/3);
  const g2 = hue2rgb(p, q, h2);
  const b2 = hue2rgb(p, q, h2 - 1/3);
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  const secondary = `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`;

  return `linear-gradient(135deg, ${hex}, ${secondary})`;
}

type ParentTheme = { primary: string; secondary: string } | null | undefined;
type GradientStop = { color: string; pos: number };

/** The first truthy value, exactly like `a || b || c`: when none is truthy, the last one is returned. */
function firstTruthy<T>(...values: [...Array<T | null | undefined>, T]): T {
  for (const value of values) if (value) return value as T;
  return values.at(-1) as T;
}

/** The host attribute whenever it was provided at all (so 0, '' and false count), else the stored value. */
function definedOr<T>(hostValue: T | undefined, stored: T): T {
  // A destructuring default applies only to `undefined` (unlike `??`, `null` is kept).
  const [value = stored] = [hostValue];
  return value;
}

/** The website theme, only when themed: an explicit `theme` argument (even null) wins over reading the page. */
function resolveTheme(useTheme: boolean, theme: ParentTheme) {
  if (!useTheme) return null;
  return theme !== undefined ? theme : getParentTheme();
}

/** Two-stop gradient when either end is set on the host; otherwise whatever is already stored. */
function gradientStopsFrom(
  start: string | undefined,
  end: string | undefined,
  stored: GradientStop[] | undefined,
  fallbackColor: string
): GradientStop[] | undefined {
  if (!start && !end) return stored;
  return [
    { color: firstTruthy(start, stored?.[0]?.color, fallbackColor), pos: 0 },
    { color: firstTruthy(end, stored?.[1]?.color, fallbackColor), pos: 100 },
  ];
}

/** A host value only overrides the preset when it differs from the bar default (which means "unset"). */
function overridePreset<T>(hostValue: T | undefined, barDefault: T, presetValue: T): T {
  return hostValue !== undefined && hostValue !== barDefault ? hostValue : presetValue;
}

function chatbarCornerRadius(hostValue: number | undefined, presetRadius: unknown) {
  if (hostValue === undefined || hostValue === 20) return presetRadius;
  return { tl: hostValue, tr: hostValue, bl: hostValue, br: hostValue };
}

function welcomeGradient(
  host: Record<string, any>,
  cws: ChatWindowState,
  useTheme: boolean,
  pTheme: ParentTheme,
  accent: string
): string {
  // Prioritise: explicit host attr > DB-stored gradient (cws.welcome.bgGradient) > computed from theme.
  // Using cws.welcome?.bgGradient as a stable fallback prevents scroll-triggered getParentTheme()
  // re-computations from causing color shifts on the welcome card.
  const explicit = firstTruthy(host.welcomeBgGradient, cws.welcome?.bgGradient);
  if (explicit) return explicit;
  if (useTheme && pTheme) {
    const secondary = pTheme.secondary || pTheme.primary;
    return `linear-gradient(135deg, ${pTheme.primary}, ${secondary})`;
  }
  return createAccentGradient(accent);
}

function welcomeButtonIconColor(
  host: Record<string, any>,
  cws: ChatWindowState,
  useTheme: boolean,
  pTheme: ParentTheme,
  accent: string
): string {
  if (host.welcomeButtonIconColor) return host.welcomeButtonIconColor;
  if (!useTheme) return accent;
  if (pTheme) return pTheme.primary;
  return firstTruthy(cws.welcome?.buttonIconColor, accent);
}

export function computeEffectiveChatbarConfig(
  host: Record<string, any>,
  cbs: ChatbarState = {} as ChatbarState,
  activeTrigger: string = 'bubble',
  theme?: { primary: string; secondary: string } | null
): ChatbarState {
  const useTheme = definedOr(host.useWebsiteTheme, cbs.useWebsiteTheme ?? true);
  const pTheme = resolveTheme(useTheme, theme);

  const isChatcard = activeTrigger === 'chatcard';
  const isChatbarTrigger = activeTrigger === 'chatbar' || isChatcard;
  const barRight = definedOr(host.barOffsetRight, cbs.barOffsetRight ?? cbs.offsetRight ?? 16);
  const barBottom = definedOr(host.barOffsetBottom, cbs.barOffsetBottom ?? cbs.offsetBottom ?? 12);
  const cardRight = definedOr(host.cardOffsetRight, cbs.cardOffsetRight ?? cbs.offsetRight ?? 16);
  const cardBottom = definedOr(host.cardOffsetBottom, cbs.cardOffsetBottom ?? cbs.offsetBottom ?? 12);

  const isCardLayout = firstTruthy(host.chatbarLayout, isChatcard ? 'card' : 'bar') === 'card';
  const preset = isCardLayout ? CHATBAR_CARD_PRESET : CHATBAR_BAR_PRESET;

  const effectiveBg = firstTruthy(host.chatbarBg, host.accentColor, pTheme ? pTheme.primary : cbs.bgColor);

  return {
    ...preset,
    ...cbs,
    useWebsiteTheme: useTheme,
    enabled: isChatbarTrigger,
    layout: isCardLayout ? 'card' : 'bar',
    width: overridePreset(host.chatbarWidth, CHATBAR_BAR_PRESET.width, preset.width),
    height: overridePreset(host.chatbarHeight, CHATBAR_BAR_PRESET.height, preset.height),
    bgColor: effectiveBg,
    gradientEnabled: definedOr(host.chatbarGradientEnabled, cbs.gradientEnabled),
    gradientStops: gradientStopsFrom(host.chatbarGradientStart, host.chatbarGradientEnd, cbs.gradientStops, effectiveBg),
    borderRadius: chatbarCornerRadius(host.chatbarBorderRadius, preset.borderRadius),
    padding: isCardLayout ? CHATBAR_CARD_PRESET.padding : firstTruthy(cbs.padding, CHATBAR_BAR_PRESET.padding),
    gap: isCardLayout ? CHATBAR_CARD_PRESET.gap : (cbs.gap ?? CHATBAR_BAR_PRESET.gap),
    text: firstTruthy(host.chatbarText, cbs.text),
    cardText: firstTruthy(host.chatcardText, cbs.cardText),
    textSize: firstTruthy(host.chatbarTextSize, cbs.textSize),
    textColor: firstTruthy(host.chatbarTextColor, cbs.textColor),
    lucideIcon: firstTruthy(host.chatbarLucideIcon, cbs.lucideIcon),
    iconWidth: firstTruthy(host.chatbarIconSize, cbs.iconWidth, preset.iconWidth, 36),
    iconHeight: firstTruthy(host.chatbarIconSize, cbs.iconHeight, preset.iconHeight, 36),
    iconColor: firstTruthy(host.chatbarIconColor, cbs.iconColor),
    barOffsetRight: barRight,
    barOffsetBottom: barBottom,
    cardOffsetRight: cardRight,
    cardOffsetBottom: cardBottom,
    offsetRight: isChatcard ? cardRight : barRight,
    offsetBottom: isChatcard ? cardBottom : barBottom,
  } as ChatbarState;
}

export function computeEffectiveBubbleConfig(
  host: Record<string, any>,
  bs: BubbleState = {} as BubbleState,
  theme?: { primary: string; secondary: string } | null
): BubbleState {
  const useTheme = definedOr(host.useWebsiteTheme, bs.useWebsiteTheme ?? true);
  const pTheme = resolveTheme(useTheme, theme);

  const effectiveBg = firstTruthy(host.bubbleBg, host.accentColor, pTheme ? pTheme.primary : bs.backgroundColor);
  const effectiveRingColor = firstTruthy(host.bubbleOutlineRingColor, pTheme ? pTheme.secondary : bs.outlineRing?.color);
  const effectiveBorderColor = firstTruthy(host.bubbleBorderColor, host.accentColor, pTheme ? pTheme.primary : bs.border?.color);

  return {
    ...bs,
    useWebsiteTheme: useTheme,
    width: firstTruthy(host.bubbleWidth, bs.width),
    height: firstTruthy(host.bubbleHeight, bs.height),
    hideOnOpen: definedOr(host.bubbleHideOnOpen, bs.hideOnOpen),
    backgroundColor: effectiveBg,
    gradientType: firstTruthy(host.bubbleGradientType, bs.gradientType),
    gradientAngle: definedOr(host.bubbleGradientAngle, bs.gradientAngle),
    gradientStops: gradientStopsFrom(host.bubbleGradientStart, host.bubbleGradientEnd, bs.gradientStops, effectiveBg),
    border: {
      ...bs.border,
      width: definedOr(host.bubbleBorderWidth, bs.border?.width),
      style: firstTruthy(host.bubbleBorderStyle, bs.border?.style, 'solid'),
      color: effectiveBorderColor,
    },
    outlineRing: {
      ...bs.outlineRing,
      enabled: definedOr(host.bubbleOutlineRingEnabled, bs.outlineRing?.enabled),
      width: definedOr(host.bubbleOutlineRingWidth, bs.outlineRing?.width),
      color: effectiveRingColor,
    },
    boxShadowBlur: definedOr(host.bubbleBoxShadowBlur, bs.boxShadowBlur),
    boxShadowOffsetY: definedOr(host.bubbleBoxShadowOffsetY, bs.boxShadowOffsetY),
    boxShadowOpacity: definedOr(host.bubbleBoxShadowOpacity, bs.boxShadowOpacity),
    innerShadow: {
      ...bs.innerShadow,
      enabled: definedOr(host.bubbleInnerShadowEnabled, bs.innerShadow?.enabled),
    },
    glass: {
      ...bs.glass,
      enabled: definedOr(host.bubbleGlassEnabled, bs.glass?.enabled),
      blur: definedOr(host.bubbleGlassBlur, bs.glass?.blur),
    },
    neon: {
      ...bs.neon,
      enabled: definedOr(host.bubbleNeonEnabled, bs.neon?.enabled),
      color: firstTruthy(host.bubbleNeonColor, bs.neon?.color),
    },
    lucideIcon: firstTruthy(host.bubbleLucideIcon, bs.lucideIcon),
    lucideSize: firstTruthy(host.bubbleLucideSize, bs.lucideSize),
    iconColor: firstTruthy(host.bubbleIconColor, bs.iconColor),
    hoverScale: definedOr(host.bubbleHoverScale, bs.hoverScale),
    idleAnim: {
      ...bs.idleAnim,
      enabled: definedOr(host.bubbleIdleAnimEnabled, bs.idleAnim?.enabled),
      type: firstTruthy(host.bubbleIdleAnimType, bs.idleAnim?.type),
    },
    tooltip: {
      ...bs.tooltip,
      enabled: definedOr(host.bubbleTooltipEnabled, bs.tooltip?.enabled),
      text: firstTruthy(host.bubbleTooltipText, bs.tooltip?.text),
      position: firstTruthy(host.bubbleTooltipPosition, bs.tooltip?.position),
      backgroundColor: firstTruthy(host.bubbleTooltipBg, bs.tooltip?.backgroundColor),
      textColor: firstTruthy(host.bubbleTooltipTextColor, bs.tooltip?.textColor),
    },
    badge: {
      ...bs.badge,
      position: firstTruthy(host.bubbleBadgePosition, bs.badge?.position),
      backgroundColor: firstTruthy(host.bubbleBadgeBg, bs.badge?.backgroundColor),
      textColor: firstTruthy(host.bubbleBadgeTextColor, bs.badge?.textColor),
    },
    offsetRight: definedOr(host.bubbleOffsetRight, bs.offsetRight ?? 16),
    offsetBottom: definedOr(host.bubbleOffsetBottom, bs.offsetBottom ?? 12),
  } as BubbleState;
}

export function computeEffectiveGreetWindowConfig(
  host: Record<string, any>,
  gws: GreetWindowState = {} as GreetWindowState,
  theme?: { primary: string; secondary: string } | null
): GreetWindowState {
  const useTheme = definedOr(host.useWebsiteTheme, gws.useWebsiteTheme ?? true);
  const pTheme = resolveTheme(useTheme, theme);

  const effectiveIconColor = firstTruthy(host.greetIconColor, host.accentColor, pTheme ? pTheme.primary : gws.iconColor);
  const effectiveBtnColor = firstTruthy(host.greetInputButtonColor, host.accentColor, pTheme ? pTheme.primary : gws.inputBox?.buttonColor);
  const effectiveBtnIconColor = firstTruthy(host.greetInputButtonIconColor, pTheme ? pTheme.primary : gws.inputBox?.buttonIconColor);

  return {
    ...gws,
    useWebsiteTheme: useTheme,
    enabled: definedOr(host.enableGreetWindow, gws.enabled),
    title: firstTruthy(host.greetTitle, gws.title),
    titleColor: firstTruthy(host.greetTitleColor, gws.titleColor),
    titleFontSize: firstTruthy(host.greetTitleFontSize, gws.titleFontSize),
    description: firstTruthy(host.greetDescription, gws.description),
    descriptionColor: firstTruthy(host.greetDescriptionColor, gws.descriptionColor),
    descriptionFontSize: firstTruthy(host.greetDescriptionFontSize, gws.descriptionFontSize),
    backgroundColor: firstTruthy(host.greetBg, gws.backgroundColor),
    width: firstTruthy(host.greetWidth, gws.width),
    borderRadius: firstTruthy(host.greetBorderRadius, gws.borderRadius),
    spacing: definedOr(host.greetSpacing, gws.spacing),
    openingTimeAfterInitialLoadSec: definedOr(host.greetOpeningDelaySec, gws.openingTimeAfterInitialLoadSec),
    animationOpeningSec: definedOr(host.greetFadeInSpeedSec, gws.animationOpeningSec),
    iconType: firstTruthy(host.greetIconType, gws.iconType),
    iconAlign: firstTruthy(host.greetIconAlign, gws.iconAlign),
    lucideIcon: firstTruthy(host.greetLucideIcon, gws.lucideIcon),
    iconSize: firstTruthy(host.greetIconSize, gws.iconSize),
    iconColor: effectiveIconColor,
    iconAnimation: firstTruthy(host.greetIconAnimation, gws.iconAnimation),
    imageUrl: firstTruthy(host.greetImageUrl, gws.imageUrl),
    inputBox: {
      ...gws.inputBox,
      enabled: definedOr(host.enableInputCard, gws.inputBox?.enabled ?? true),
      openingTimeAfterInitialLoadSec: definedOr(host.greetInputOpeningDelaySec, gws.inputBox?.openingTimeAfterInitialLoadSec),
      layout: firstTruthy(host.greetInputLayout, gws.inputBox?.layout),
      placeholder: firstTruthy(host.greetInputPlaceholder, gws.inputBox?.placeholder),
      backgroundColor: firstTruthy(host.greetInputBg, gws.inputBox?.backgroundColor),
      textColor: firstTruthy(host.greetInputTextColor, gws.inputBox?.textColor),
      borderRadius: firstTruthy(host.greetInputBorderRadius, gws.inputBox?.borderRadius),
      buttonColor: effectiveBtnColor,
      buttonIconColor: effectiveBtnIconColor,
    },
  } as GreetWindowState;
}

export function computeEffectiveChatWindowConfig(
  host: Record<string, any>,
  cws: ChatWindowState = {} as ChatWindowState,
  activeOffsetBottom: number = 12,
  theme?: { primary: string; secondary: string } | null
): ChatWindowState {
  const useTheme = definedOr(host.useWebsiteTheme, cws.useWebsiteTheme ?? false);
  const pTheme = resolveTheme(useTheme, theme);

  /** The theme's primary colour when themed, otherwise the value stored in the config. */
  const themedOr = <T,>(stored: T) => (useTheme && pTheme ? pTheme.primary : stored);

  const effectiveAccent = firstTruthy(host.accentColor, themedOr(firstTruthy(cws.accentColor, '#0b5fff')));
  const primaryColor = firstTruthy(host.accentColor, themedOr(null));

  // Each of these: host attribute > the host's accent/theme colour > the stored value > the overall accent.
  const accentedColor = (hostValue: string | undefined, stored: string | undefined) =>
    firstTruthy(hostValue, primaryColor, themedOr(stored), effectiveAccent);

  // A themed header can land on a colour the configured text can't be read on.
  const headerBg = accentedColor(host.headerBg, cws.headerBg);

  return {
    ...cws,
    useWebsiteTheme: useTheme,
    clientName: firstTruthy(host.clientName, cws.clientName),
    agentName: firstTruthy(host.agentName, cws.agentName),
    widgetWidth: firstTruthy(host.widgetWidth, cws.widgetWidth),
    widgetHeight: firstTruthy(host.widgetHeight, cws.widgetHeight),
    expandedWidth: firstTruthy(host.expandedWidth, cws.expandedWidth),
    widgetBorderRadius: firstTruthy(host.widgetBorderRadius, cws.widgetBorderRadius),
    accentColor: effectiveAccent,
    headerBg,
    headerTextColor: firstTruthy(host.headerTextColor, legibleOn(headerBg, cws.headerTextColor)),
    headerBorderColor: firstTruthy(host.headerBorderColor, cws.headerBorderColor),
    headerAvatarBg: firstTruthy(host.headerAvatarBg, cws.headerAvatarBg),
    headerAvatarColor: firstTruthy(host.headerAvatarColor, cws.headerAvatarColor),
    activeDot: {
      ...cws.activeDot,
      color: firstTruthy(host.activeDotColor, cws.activeDot?.color),
      animate: definedOr(host.activeDotAnimate, cws.activeDot?.animate),
    },
    bodyBg: firstTruthy(host.bodyBg, cws.bodyBg),
    visitorBubbleBg: accentedColor(host.visitorBubbleBg, cws.visitorBubbleBg),
    visitorBubbleColor: firstTruthy(host.visitorBubbleTextColor, cws.visitorBubbleColor),
    visitorBubbleFontSize: firstTruthy(host.visitorBubbleFontSize, cws.visitorBubbleFontSize),
    visitorBubbleBorderRadius: firstTruthy(host.visitorBubbleBorderRadius, cws.visitorBubbleBorderRadius),
    agentBubbleBg: firstTruthy(host.agentBubbleBg, cws.agentBubbleBg),
    agentBubbleColor: firstTruthy(host.agentBubbleTextColor, cws.agentBubbleColor),
    agentBubbleBorderColor: firstTruthy(host.agentBubbleBorderColor, cws.agentBubbleBorderColor),
    agentBubbleFontSize: firstTruthy(host.agentBubbleFontSize, cws.agentBubbleFontSize),
    agentBubbleBorderRadius: firstTruthy(host.agentBubbleBorderRadius, cws.agentBubbleBorderRadius),
    agentAvatarBg: accentedColor(host.agentAvatarBg, cws.agentAvatarBg),
    agentAvatarColor: firstTruthy(host.agentAvatarColor, cws.agentAvatarColor),
    agentAvatarUrl: firstTruthy(host.agentAvatarUrl, cws.agentAvatarUrl),
    inputBg: firstTruthy(host.inputBg, cws.inputBg),
    inputTextColor: firstTruthy(host.inputTextColor, cws.inputTextColor),
    inputPlaceholderColor: firstTruthy(host.inputPlaceholderColor, cws.inputPlaceholderColor),
    inputBorderColor: firstTruthy(host.inputBorderColor, cws.inputBorderColor),
    inputFocusBorderColor: accentedColor(host.inputFocusBorderColor, cws.inputFocusBorderColor),
    inputBorderRadius: firstTruthy(host.inputBorderRadius, cws.inputBorderRadius),
    textareaFontSize: firstTruthy(host.textareaFontSize, cws.textareaFontSize),
    attachButtonBg: firstTruthy(host.attachButtonBg, cws.attachButtonBg),
    attachButtonColor: firstTruthy(host.attachButtonColor, cws.attachButtonColor),
    emojiButtonColor: firstTruthy(host.emojiButtonColor, cws.emojiButtonColor),
    sendIconType: firstTruthy(host.sendIconType, cws.sendIconType),
    sendButtonBgActive: accentedColor(host.sendButtonBgActive, cws.sendButtonBgActive),
    sendButtonColorActive: firstTruthy(host.sendButtonColorActive, cws.sendButtonColorActive),
    sendButtonBgInactive: firstTruthy(host.sendButtonBgInactive, cws.sendButtonBgInactive),
    sendButtonColorInactive: firstTruthy(host.sendButtonColorInactive, cws.sendButtonColorInactive),
    footerBg: firstTruthy(host.footerBg, cws.footerBg),
    footerTextColor: firstTruthy(host.footerTextColor, cws.footerTextColor),
    poweredByText: firstTruthy(host.poweredByText, cws.poweredByText),
    poweredByLink: firstTruthy(host.poweredByLink, cws.poweredByLink),
    poweredByColor: accentedColor(host.poweredByColor, cws.poweredByColor),
    modernUi: definedOr(host.modernUi, cws.modernUi),
    typingIndicator: definedOr(host.typingIndicator, cws.typingIndicator),
    attachmentsEnabled: definedOr(host.attachmentsEnabled, cws.attachmentsEnabled),
    ticksEnabled: definedOr(host.ticksEnabled, cws.ticksEnabled),
    sentTickColor: firstTruthy(host.sentTickColor, cws.sentTickColor),
    readTickColor: firstTruthy(host.readTickColor, cws.readTickColor),
    widgetShadow: definedOr(host.widgetShadow, cws.widgetShadow),
    widgetShadowBlur: firstTruthy(host.widgetShadowBlur, cws.widgetShadowBlur),
    widgetShadowColor: firstTruthy(host.widgetShadowColor, cws.widgetShadowColor),
    widgetBorderEnabled: definedOr(host.widgetBorderEnabled, cws.widgetBorderEnabled),
    widgetBorderWidth: firstTruthy(host.widgetBorderWidth, cws.widgetBorderWidth),
    widgetBorderColor: firstTruthy(host.widgetBorderColor, cws.widgetBorderColor),
    endChatConfirmMessage: firstTruthy(host.endChatConfirmMessage, cws.endChatConfirmMessage),
    endChatConfirmLabel: firstTruthy(host.endChatConfirmLabel, cws.endChatConfirmLabel),
    endChatCancelLabel: firstTruthy(host.endChatCancelLabel, cws.endChatCancelLabel),
    modalCardBg: firstTruthy(host.modalCardBg, cws.modalCardBg),
    modalMessageColor: firstTruthy(host.modalMessageColor, cws.modalMessageColor),
    modalBorderRadius: firstTruthy(host.modalBorderRadius, cws.modalBorderRadius),
    endChatConfirmBg: accentedColor(host.endChatConfirmBg, cws.endChatConfirmBg),
    endChatConfirmTextColor: firstTruthy(host.endChatConfirmTextColor, cws.endChatConfirmTextColor),
    offsetRight: 16,
    offsetBottom: activeOffsetBottom,
    welcome: {
      ...cws.welcome,
      enabled: definedOr(host.enableWelcomeCard, cws.welcome?.enabled ?? true),
      cardLayout: firstTruthy(host.welcomeCardLayout, cws.welcome?.cardLayout),
      title: firstTruthy(host.welcomeTitle, cws.welcome?.title),
      description: firstTruthy(host.welcomeDescription, cws.welcome?.description),
      bgGradient: welcomeGradient(host, cws, useTheme, pTheme, effectiveAccent),
      buttonText: firstTruthy(host.welcomeButtonText, cws.welcome?.buttonText),
      buttonSubtext: firstTruthy(host.welcomeButtonSubtext, cws.welcome?.buttonSubtext),
      buttonBg: firstTruthy(host.welcomeButtonBg, cws.welcome?.buttonBg),
      buttonTextColor: firstTruthy(host.welcomeButtonTextColor, cws.welcome?.buttonTextColor),
      buttonIconColor: welcomeButtonIconColor(host, cws, useTheme, pTheme, effectiveAccent),
      logoUrl: firstTruthy(host.welcomeLogoUrl, cws.welcome?.logoUrl),
      cardBorderRadius: firstTruthy(host.welcomeCardBorderRadius, cws.welcome?.cardBorderRadius),
      cardBlur: firstTruthy(host.welcomeCardBlur, cws.welcome?.cardBlur),
    },
  } as ChatWindowState;
}

export function computeEffectiveFeaturesConfig(
  host: Record<string, any>,
  fs: FeaturesState = {} as FeaturesState
): FeaturesState {
  const voiceCall = definedOr(host.enableVoiceCall, fs.voiceCallEnabled ?? fs.voiceCallMaster);
  const videoCall = definedOr(host.enableVideoCall, fs.videoCallEnabled ?? fs.videoCallMaster);
  return {
    ...fs,
    voiceCallEnabled: voiceCall,
    voiceCallMaster: voiceCall,
    voiceCallAgents: voiceCall,
    videoCallEnabled: videoCall,
    videoCallMaster: videoCall,
    videoCallAgents: videoCall,
    closeChatVisitor: definedOr(host.enableCloseChatVisitor, fs.closeChatVisitor),
    prechatEnabled: definedOr(host.prechatEnabled, fs.prechatEnabled),
    postchatEnabled: definedOr(host.postchatEnabled, fs.postchatEnabled),
  } as FeaturesState;
}
