import { describe, it, expect } from 'vitest';
import {
  computeEffectiveChatbarConfig,
  computeEffectiveBubbleConfig,
  computeEffectiveGreetWindowConfig,
  computeEffectiveChatWindowConfig,
  computeEffectiveFeaturesConfig
} from '../../config/widget-config.js';
import { CHATBAR_BAR_PRESET, CHATBAR_CARD_PRESET } from '../../config/chatbar-presets.js';

const THEME = { primary: '#112233', secondary: '#445566' };
const stored = (o: object = {}) => o as never;

describe('chatbar override rules', () => {
  const run = (host: object, cbs: object = {}, trigger = 'chatbar', theme: unknown = null) =>
    computeEffectiveChatbarConfig(host, stored(cbs), trigger, theme as never) as any;

  it('is enabled only for the chatbar and chatcard triggers', () => {
    expect(run({}, {}, 'bubble').enabled).toBe(false);
    expect(run({}, {}, 'chatbar').enabled).toBe(true);
    expect(run({}, {}, 'chatcard').enabled).toBe(true);
  });

  it('picks the card layout from the trigger unless the host asks for a layout', () => {
    expect(run({}, {}, 'chatbar').layout).toBe('bar');
    expect(run({}, {}, 'chatcard').layout).toBe('card');
    expect(run({ chatbarLayout: 'card' }, {}, 'chatbar').layout).toBe('card');
    expect(run({ chatbarLayout: 'bar' }, {}, 'chatcard').layout).toBe('bar');
    expect(run({ chatbarLayout: '' }, {}, 'chatcard').layout).toBe('card');
  });

  it('only lets a host size override the preset when it differs from the bar default', () => {
    expect(run({ chatbarWidth: 300, chatbarHeight: 60 }).width).toBe(300);
    expect(run({ chatbarWidth: 300, chatbarHeight: 60 }).height).toBe(60);
    expect(run({ chatbarWidth: CHATBAR_BAR_PRESET.width, chatbarHeight: CHATBAR_BAR_PRESET.height }, {}, 'chatcard').width).toBe(CHATBAR_CARD_PRESET.width);
    expect(run({ chatbarWidth: CHATBAR_BAR_PRESET.width, chatbarHeight: CHATBAR_BAR_PRESET.height }, {}, 'chatcard').height).toBe(CHATBAR_CARD_PRESET.height);
    expect(run({}).width).toBe(CHATBAR_BAR_PRESET.width);
  });

  it('treats a corner radius of 20 as unset, and otherwise rounds every corner', () => {
    expect(run({ chatbarBorderRadius: 20 }).borderRadius).toEqual(CHATBAR_BAR_PRESET.borderRadius);
    expect(run({}).borderRadius).toEqual(CHATBAR_BAR_PRESET.borderRadius);
    expect(run({ chatbarBorderRadius: 8 }).borderRadius).toEqual({ tl: 8, tr: 8, bl: 8, br: 8 });
    expect(run({ chatbarBorderRadius: 0 }).borderRadius).toEqual({ tl: 0, tr: 0, bl: 0, br: 0 });
  });

  it('builds a two-stop gradient when either end is set, filling the other from the stored stops or the background', () => {
    expect(run({}, { gradientStops: [{ color: 'red', pos: 0 }] }).gradientStops).toEqual([{ color: 'red', pos: 0 }]);
    expect(run({ chatbarGradientStart: 'blue', chatbarBg: '#abcdef' }).gradientStops).toEqual([
      { color: 'blue', pos: 0 },
      { color: '#abcdef', pos: 100 }
    ]);
    expect(
      run({ chatbarGradientEnd: 'green' }, { bgColor: '#111111', gradientStops: [{ color: 'red', pos: 0 }, { color: 'pink', pos: 100 }] }).gradientStops
    ).toEqual([
      { color: 'red', pos: 0 },
      { color: 'green', pos: 100 }
    ]);
  });

  it('resolves the background: host bar colour, host accent, theme, then stored colour', () => {
    const cbs = { bgColor: '#stored1' };
    expect(run({ chatbarBg: 'a', accentColor: 'b' }, cbs, 'chatbar', THEME).bgColor).toBe('a');
    expect(run({ accentColor: 'b' }, cbs, 'chatbar', THEME).bgColor).toBe('b');
    expect(run({}, cbs, 'chatbar', THEME).bgColor).toBe('#112233');
    expect(run({}, cbs, 'chatbar', null).bgColor).toBe('#stored1');
    expect(run({ useWebsiteTheme: false }, cbs, 'chatbar', THEME).bgColor).toBe('#stored1');
    expect(run({}, { ...cbs, useWebsiteTheme: false }, 'chatbar', THEME).bgColor).toBe('#stored1');
  });

  it('uses the card or bar offsets depending on the trigger, with a chain of fallbacks', () => {
    const cbs = { barOffsetRight: 1, barOffsetBottom: 2, cardOffsetRight: 3, cardOffsetBottom: 4 };
    const bar = run({}, cbs, 'chatbar');
    expect([bar.offsetRight, bar.offsetBottom]).toEqual([1, 2]);
    const card = run({}, cbs, 'chatcard');
    expect([card.offsetRight, card.offsetBottom]).toEqual([3, 4]);
    const shared = run({}, { offsetRight: 9, offsetBottom: 8 }, 'chatcard');
    expect([shared.offsetRight, shared.offsetBottom]).toEqual([9, 8]);
    const defaults = run({}, {}, 'chatbar');
    expect([defaults.offsetRight, defaults.offsetBottom]).toEqual([16, 12]);
    // A host value of 0 is a real offset.
    expect(run({ barOffsetRight: 0 }, cbs, 'chatbar').offsetRight).toBe(0);
  });

  it('falls back through host, stored and preset values for the icon size, padding, gap and text', () => {
    expect(run({ chatbarIconSize: 20 }).iconWidth).toBe(20);
    expect(run({}, { iconWidth: 24 }).iconWidth).toBe(24);
    expect(run({}).iconWidth).toBe(CHATBAR_BAR_PRESET.iconWidth || 36);
    expect(run({}, { padding: '1px' }).padding).toBe('1px');
    expect(run({}, { padding: '1px' }, 'chatcard').padding).toBe(CHATBAR_CARD_PRESET.padding);
    expect(run({}, {}).padding).toBe(CHATBAR_BAR_PRESET.padding);
    expect(run({}, { gap: 0 }).gap).toBe(0);
    expect(run({}, {}, 'chatcard').gap).toBe(CHATBAR_CARD_PRESET.gap);
    expect(run({ chatbarText: 'Hi', chatcardText: 'Card' }, { text: 'Old', cardText: 'Older' })).toMatchObject({ text: 'Hi', cardText: 'Card' });
    expect(run({}, { text: 'Old' }).text).toBe('Old');
  });

  it('lets a provided gradient flag, even false, win over the stored one', () => {
    expect(run({ chatbarGradientEnabled: false }, { gradientEnabled: true }).gradientEnabled).toBe(false);
    expect(run({}, { gradientEnabled: true }).gradientEnabled).toBe(true);
  });
});

describe('bubble override rules', () => {
  const run = (host: object, bs: object = {}, theme: unknown = null) => computeEffectiveBubbleConfig(host, stored(bs), theme as never) as any;

  it('lets a provided value win even when falsy, but only a truthy value for text-like settings', () => {
    const bs = { hideOnOpen: true, hoverScale: 1.2, width: 60, lucideIcon: 'Bell' };
    const res = run({ bubbleHideOnOpen: false, bubbleHoverScale: 0, bubbleWidth: 0, bubbleLucideIcon: '' }, bs);
    expect([res.hideOnOpen, res.hoverScale]).toEqual([false, 0]);
    // 0 and '' do not override a stored width or icon.
    expect([res.width, res.lucideIcon]).toEqual([60, 'Bell']);
    expect(run({ bubbleWidth: 80 }, bs).width).toBe(80);
  });

  it('defaults the border style and merges nested settings without losing stored keys', () => {
    expect(run({}, {}).border.style).toBe('solid');
    const res = run(
      { bubbleBorderWidth: 3, bubbleOutlineRingEnabled: true, bubbleGlassBlur: 0, bubbleTooltipText: 'Hi' },
      { border: { color: 'red', extra: 1 }, outlineRing: { width: 5 }, glass: { enabled: true }, tooltip: { enabled: true, text: 'Old' }, badge: { size: 12 } }
    );
    expect(res.border).toMatchObject({ width: 3, extra: 1, style: 'solid' });
    expect(res.outlineRing).toMatchObject({ enabled: true, width: 5 });
    expect(res.glass).toMatchObject({ enabled: true, blur: 0 });
    expect(res.tooltip).toMatchObject({ enabled: true, text: 'Hi' });
    expect(res.badge).toMatchObject({ size: 12 });
  });

  it('creates the nested groups even when nothing is stored', () => {
    const res = run({}, {});
    for (const key of ['border', 'outlineRing', 'innerShadow', 'glass', 'neon', 'idleAnim', 'tooltip', 'badge']) {
      expect(res[key]).toBeTypeOf('object');
    }
  });

  it('colours background, ring and border from the host, then the theme, then the stored values', () => {
    const bs = { backgroundColor: 'stored-bg', outlineRing: { color: 'stored-ring' }, border: { color: 'stored-border' } };
    const themed = run({}, bs, THEME);
    expect([themed.backgroundColor, themed.outlineRing.color, themed.border.color]).toEqual(['#112233', '#445566', '#112233']);
    const plain = run({}, bs, null);
    expect([plain.backgroundColor, plain.outlineRing.color, plain.border.color]).toEqual(['stored-bg', 'stored-ring', 'stored-border']);
    const host = run({ bubbleBg: 'a', accentColor: 'b', bubbleOutlineRingColor: 'c', bubbleBorderColor: 'd' }, bs, THEME);
    expect([host.backgroundColor, host.outlineRing.color, host.border.color]).toEqual(['a', 'c', 'd']);
    expect(run({ accentColor: 'b' }, bs, THEME).backgroundColor).toBe('b');
    expect(run({ accentColor: 'b' }, bs, THEME).border.color).toBe('b');
  });

  it('builds gradient stops from the host ends and defaults the offsets', () => {
    expect(run({ bubbleGradientStart: 'x', bubbleGradientEnd: 'y' }).gradientStops).toEqual([
      { color: 'x', pos: 0 },
      { color: 'y', pos: 100 }
    ]);
    expect(run({}, { gradientStops: [{ color: 'k', pos: 0 }] }).gradientStops).toEqual([{ color: 'k', pos: 0 }]);
    const defaults = run({}, {});
    expect([defaults.offsetRight, defaults.offsetBottom]).toEqual([16, 12]);
    const given = run({ bubbleOffsetRight: 0, bubbleOffsetBottom: 5 }, { offsetRight: 99 });
    expect([given.offsetRight, given.offsetBottom]).toEqual([0, 5]);
  });
});

describe('greet window override rules', () => {
  const run = (host: object, gws: object = {}, theme: unknown = null) => computeEffectiveGreetWindowConfig(host, stored(gws), theme as never) as any;

  it('enables the input box by default, but lets the host or stored setting turn it off', () => {
    expect(run({}).inputBox.enabled).toBe(true);
    expect(run({ enableInputCard: false }).inputBox.enabled).toBe(false);
    expect(run({}, { inputBox: { enabled: false } }).inputBox.enabled).toBe(false);
    expect(run({ enableInputCard: true }, { inputBox: { enabled: false } }).inputBox.enabled).toBe(true);
  });

  it('keeps provided timings (including 0) and truthy-only text settings', () => {
    const res = run(
      { greetOpeningDelaySec: 0, greetFadeInSpeedSec: 0, greetSpacing: 0, enableGreetWindow: false, greetTitle: '', greetWidth: 0 },
      { openingTimeAfterInitialLoadSec: 3, animationOpeningSec: 1, spacing: 8, enabled: true, title: 'Stored', width: 320 }
    );
    expect([res.openingTimeAfterInitialLoadSec, res.animationOpeningSec, res.spacing, res.enabled]).toEqual([0, 0, 0, false]);
    expect([res.title, res.width]).toEqual(['Stored', 320]);
  });

  it('colours the icon and input button from the host, then the theme, then stored values', () => {
    const gws = { iconColor: 'stored-icon', inputBox: { buttonColor: 'stored-btn', buttonIconColor: 'stored-btn-icon' } };
    const themed = run({}, gws, THEME);
    expect([themed.iconColor, themed.inputBox.buttonColor, themed.inputBox.buttonIconColor]).toEqual(['#112233', '#112233', '#112233']);
    const plain = run({}, gws, null);
    expect([plain.iconColor, plain.inputBox.buttonColor, plain.inputBox.buttonIconColor]).toEqual(['stored-icon', 'stored-btn', 'stored-btn-icon']);
    const host = run({ greetIconColor: 'a', greetInputButtonColor: 'b', greetInputButtonIconColor: 'c' }, gws, THEME);
    expect([host.iconColor, host.inputBox.buttonColor, host.inputBox.buttonIconColor]).toEqual(['a', 'b', 'c']);
    expect(run({ accentColor: 'z' }, gws, THEME).inputBox.buttonColor).toBe('z');
    // The button icon ignores the accent colour.
    expect(run({ accentColor: 'z' }, gws, null).inputBox.buttonIconColor).toBe('stored-btn-icon');
  });
});

describe('chat window override rules', () => {
  const run = (host: object, cws: object = {}, bottom?: number, theme: unknown = null) =>
    computeEffectiveChatWindowConfig(host, stored(cws), bottom, theme as never) as any;

  it('resolves the accent: host, then the theme when themed, then stored, then the default blue', () => {
    expect(run({ accentColor: 'red' }, { accentColor: 'stored' }, 12, THEME).accentColor).toBe('red');
    expect(run({ useWebsiteTheme: true }, { accentColor: 'stored' }, 12, THEME).accentColor).toBe('#112233');
    expect(run({ useWebsiteTheme: true }, { accentColor: 'stored' }, 12, null).accentColor).toBe('stored');
    expect(run({}, { accentColor: 'stored', useWebsiteTheme: false }, 12, THEME).accentColor).toBe('stored');
    expect(run({}, {}, 12, THEME).accentColor).toBe('#0b5fff');
    // Unlike the other widgets, the chat window is not themed by default.
    expect(run({}, { accentColor: 'stored' }, 12, THEME).useWebsiteTheme).toBe(false);
  });

  it('accents the seven coloured parts from host, accent, theme, stored, then the overall accent', () => {
    const parts: Array<[string, string]> = [
      ['visitorBubbleBg', 'visitorBubbleBg'],
      ['headerBg', 'headerBg'],
      ['agentAvatarBg', 'agentAvatarBg'],
      ['inputFocusBorderColor', 'inputFocusBorderColor'],
      ['sendButtonBgActive', 'sendButtonBgActive'],
      ['poweredByColor', 'poweredByColor'],
      ['endChatConfirmBg', 'endChatConfirmBg']
    ];
    for (const [hostKey, key] of parts) {
      const stored1 = { [key]: 'stored-' + key };
      expect(run({ [hostKey]: 'own' }, stored1)[key], hostKey).toBe('own');
      expect(run({ accentColor: 'acc', [hostKey]: '' }, stored1)[key], hostKey).toBe('acc');
      expect(run({ useWebsiteTheme: true }, stored1, 12, THEME)[key], hostKey).toBe('#112233');
      expect(run({}, stored1)[key], hostKey).toBe('stored-' + key);
      expect(run({ accentColor: '' }, {}, 12, null)[key], hostKey).toBe('#0b5fff');
    }
  });

  it('uses the theme gradient for the welcome card unless a gradient is set on the host or stored', () => {
    expect(run({ welcomeBgGradient: 'host-g' }, { welcome: { bgGradient: 'stored-g' } }).welcome.bgGradient).toBe('host-g');
    expect(run({}, { welcome: { bgGradient: 'stored-g' } }, 12, THEME).welcome.bgGradient).toBe('stored-g');
    expect(run({ useWebsiteTheme: true }, {}, 12, THEME).welcome.bgGradient).toBe('linear-gradient(135deg, #112233, #445566)');
    expect(run({ useWebsiteTheme: true }, {}, 12, { primary: '#abc', secondary: '' }).welcome.bgGradient).toBe('linear-gradient(135deg, #abc, #abc)');
    expect(run({ accentColor: '#0000ff' }, {}, 12, null).welcome.bgGradient).toMatch(/^linear-gradient\(135deg, #0000ff, #/);
  });

  it('picks the welcome button icon colour by theme state', () => {
    expect(run({ welcomeButtonIconColor: 'own' }, {}, 12, THEME).welcome.buttonIconColor).toBe('own');
    expect(run({ accentColor: 'acc' }, { useWebsiteTheme: false }, 12, THEME).welcome.buttonIconColor).toBe('acc');
    expect(run({ useWebsiteTheme: true }, {}, 12, THEME).welcome.buttonIconColor).toBe('#112233');
    expect(run({ useWebsiteTheme: true }, { welcome: { buttonIconColor: 'stored' } }, 12, null).welcome.buttonIconColor).toBe('stored');
    expect(run({ useWebsiteTheme: true }, {}, 12, null).welcome.buttonIconColor).toBe('#0b5fff');
  });

  it('keeps provided booleans (including false), enables the welcome card by default, and merges nested settings', () => {
    const res = run(
      { modernUi: false, typingIndicator: false, widgetShadow: false, activeDotAnimate: false, enableWelcomeCard: false, welcomeTitle: 'Hello' },
      { modernUi: true, activeDot: { color: 'red' }, welcome: { enabled: true, title: 'Old', description: 'Keep' } }
    );
    expect([res.modernUi, res.typingIndicator, res.widgetShadow]).toEqual([false, false, false]);
    expect(res.activeDot).toEqual({ color: 'red', animate: false });
    expect(res.welcome).toMatchObject({ enabled: false, title: 'Hello', description: 'Keep' });
    expect(run({}, {}).welcome.enabled).toBe(true);
    expect(run({}, { welcome: { enabled: false } }).welcome.enabled).toBe(false);
  });

  it('pins the panel to the right and lets the caller set the bottom offset', () => {
    expect(run({}, {}, 40)).toMatchObject({ offsetRight: 16, offsetBottom: 40 });
    expect(run({}, {}, 0).offsetBottom).toBe(0);
    expect(run({}, {}).offsetBottom).toBe(12);
  });
});

describe('features override rules', () => {
  const run = (host: object, fs: object = {}) => computeEffectiveFeaturesConfig(host, stored(fs)) as any;

  it('fans the voice and video switches out to their enabled, master and agent flags', () => {
    const on = run({ enableVoiceCall: true, enableVideoCall: false });
    expect([on.voiceCallEnabled, on.voiceCallMaster, on.voiceCallAgents]).toEqual([true, true, true]);
    expect([on.videoCallEnabled, on.videoCallMaster, on.videoCallAgents]).toEqual([false, false, false]);
  });

  it('falls back to the stored enabled flag, then the stored master flag', () => {
    expect(run({}, { voiceCallEnabled: true, voiceCallMaster: false }).voiceCallAgents).toBe(true);
    expect(run({}, { voiceCallMaster: true }).voiceCallEnabled).toBe(true);
    expect(run({}, { videoCallEnabled: false, videoCallMaster: true }).videoCallMaster).toBe(false);
    expect(run({}, { videoCallMaster: true }).videoCallAgents).toBe(true);
  });

  it('keeps provided chat flags, including false, and otherwise the stored ones', () => {
    const res = run({ enableCloseChatVisitor: false, prechatEnabled: false }, { closeChatVisitor: true, prechatEnabled: true, postchatEnabled: true });
    expect([res.closeChatVisitor, res.prechatEnabled, res.postchatEnabled]).toEqual([false, false, true]);
  });
});
