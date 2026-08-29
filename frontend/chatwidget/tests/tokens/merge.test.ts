import { describe, it, expect } from 'vitest';
import { DEFAULT_TOKEN_THEME } from '../../tokens/default-theme.js';
import {
  mergeTheme,
  sanitizeConfig,
  computeEffectiveChatbarConfig,
  computeEffectiveBubbleConfig,
  computeEffectiveGreetWindowConfig,
  computeEffectiveChatWindowConfig,
  computeEffectiveFeaturesConfig,
  GROUPS,
} from '../../tokens/merge.js';

describe('tokens/merge.ts', () => {
  it('exports GROUPS array', () => {
    expect(GROUPS).toBeDefined();
    expect(GROUPS.length).toBeGreaterThan(0);
  });

  it('merges valid partial theme over defaults', () => {
    const res = mergeTheme({
      version: 'v1',
      colors: { accent: '#112233' },
      grad: 'linear-gradient(red, blue)',
    });
    expect(res.theme.colors.accent).toBe('#112233');
    expect(res.theme.grad).toBe('linear-gradient(red, blue)');
  });

  it('collects warnings for invalid keys, types, and CSS injection in mergeTheme', () => {
    const res = mergeTheme({
      version: 'invalid_v2' as any,
      colors: { unknownKey: 'val', accent: 123 as any, muted: 'red; body { display:none }' },
      grad: 456 as any,
      unknownTopLevel: 'test',
    } as any);

    expect(res.warnings.length).toBeGreaterThan(0);
    expect(res.warnings.some((w) => w.includes('unsupported version'))).toBe(true);
    expect(res.warnings.some((w) => w.includes('unknown'))).toBe(true);
    expect(res.warnings.some((w) => w.includes('must be a string'))).toBe(true);
    expect(res.warnings.some((w) => w.includes('rejected'))).toBe(true);
  });

  it('handles grad CSS injection warning in mergeTheme', () => {
    const res = mergeTheme({
      grad: 'red; </style>',
    });
    expect(res.warnings.some((w) => w.includes('grad'))).toBe(true);
  });

  it('handles dark overrides and undefined defaults.dark in mergeTheme', () => {
    const res = mergeTheme({
      dark: {
        colors: { bg: '#000000' },
      },
    } as any);
    expect(res.theme.dark?.colors.bg).toBe('#000000');

    const resUndef = mergeTheme(undefined, { ...DEFAULT_TOKEN_THEME, dark: undefined } as any);
    expect(resUndef.theme.version).toBe('v1');
  });

  it('sanitizes config objects by removing CSS injection payloads and preserving primitives', () => {
    const input = {
      safe: 'hello world',
      num: 123,
      bool: true,
      unsafe: 'color: red; </script>',
      nested: {
        safeChild: 'nice',
        unsafeChild: 'background: url(javascript:alert(1)); }',
      },
      list: ['good', 'bad; { }'],
    };

    const { value, warnings } = sanitizeConfig(input, 'testConfig');
    expect(value.safe).toBe('hello world');
    expect(value.num).toBe(123);
    expect(value.bool).toBe(true);
    expect(value.unsafe).toBeUndefined();
    expect(value.nested.safeChild).toBe('nice');
    expect(value.nested.unsafeChild).toBeUndefined();
  });

  it('computes effective chatbar config for different triggers and overrides', () => {
    const resBar = computeEffectiveChatbarConfig(
      {
        useWebsiteTheme: false,
        chatbarBg: '#ff0000',
        chatbarWidth: 300,
        chatbarGradientStart: '#000000',
        chatbarGradientEnd: '#ffffff',
        chatbarBorderRadius: 10,
      },
      {} as any,
      'chatbar'
    );
    expect(resBar.enabled).toBe(true);
    expect(resBar.layout).toBe('bar');
    expect(resBar.bgColor).toBe('#ff0000');
    expect(resBar.width).toBe(300);

    const resCard = computeEffectiveChatbarConfig(
      {
        chatbarLayout: 'card',
      },
      {} as any,
      'chatcard'
    );
    expect(resCard.layout).toBe('card');
    expect(resCard.enabled).toBe(true);
  });

  it('computes effective bubble config with all custom host overrides', () => {
    const res = computeEffectiveBubbleConfig(
      {
        useWebsiteTheme: true,
        bubbleBg: '#123456',
        bubbleGradientStart: '#111',
        bubbleGradientEnd: '#222',
        bubbleBorderWidth: 2,
        bubbleOutlineRingEnabled: true,
        bubbleGlassEnabled: true,
        bubbleNeonEnabled: true,
        bubbleIdleAnimEnabled: true,
        bubbleTooltipEnabled: true,
        bubbleTooltipText: 'Help me',
        bubbleBadgePosition: 'top-left',
        bubbleBadgeBg: 'blue',
      },
      {} as any
    );

    expect(res.backgroundColor).toBe('#123456');
    expect(res.border.width).toBe(2);
    expect(res.tooltip?.text).toBe('Help me');
  });

  it('computes effective greet window config', () => {
    const res = computeEffectiveGreetWindowConfig(
      {
        enableGreetWindow: true,
        greetTitle: 'Welcome title',
        greetIconColor: '#abcdef',
        enableInputCard: true,
      },
      {} as any
    );
    expect(res.enabled).toBe(true);
    expect(res.title).toBe('Welcome title');
    expect(res.iconColor).toBe('#abcdef');
  });

  it('computes effective chat window config with host accent color and welcome card settings', () => {
    const res = computeEffectiveChatWindowConfig(
      {
        useWebsiteTheme: false,
        accentColor: '#990000',
        enableWelcomeCard: true,
        welcomeTitle: 'Hello Welcome',
      },
      {} as any
    );
    expect(res.accentColor).toBe('#990000');
    expect(res.visitorBubbleBg).toBe('#990000');
    expect(res.welcome?.title).toBe('Hello Welcome');
  });

  it('computes effective features config', () => {
    const res = computeEffectiveFeaturesConfig(
      {
        enableVoiceCall: true,
        enableVideoCall: false,
        prechatEnabled: true,
      },
      {} as any
    );
    expect(res.voiceCallEnabled).toBe(true);
    expect(res.videoCallEnabled).toBe(false);
    expect(res.prechatEnabled).toBe(true);
  });
});
