import { describe, it, expect } from 'vitest';
import {
  computeEffectiveChatbarConfig,
  computeEffectiveBubbleConfig,
  computeEffectiveGreetWindowConfig,
  computeEffectiveChatWindowConfig,
  computeEffectiveFeaturesConfig,
} from '../../config/widget-config.js';

describe('config/widget-config.ts', () => {
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
