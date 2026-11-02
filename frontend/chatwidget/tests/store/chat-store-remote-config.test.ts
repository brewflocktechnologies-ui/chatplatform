import { describe, it, expect, vi, beforeEach } from 'vitest';

const env = {
  dark: false,
  theme: { primary: '#111111', secondary: '#222222' },
  cfg: {} as any,
  observers: [] as Array<() => void>
};

vi.mock('../../utils/theme.js', () => ({
  getParentTheme: () => env.theme,
  isHostDark: () => env.dark,
  observeDarkMode: (cb: () => void) => {
    env.observers.push(cb);
    return () => {};
  },
  getWidgetBaseUrl: () => ''
}));
vi.mock('../../utils/config.js', () => ({
  getClientId: () => 'c',
  fetchClientConfig: async () => env.cfg
}));

import {
  initStore,
  bubbleStore,
  greetWindowStore,
  chatbarStore,
  chatWindowStore,
  chatStore,
  featuresStore,
  updateStoreConfig,
  injectStoreConfig,
  _resetStoreForTest
} from '../../store/chat-store.js';

async function boot(cfg: any, dark = false) {
  env.cfg = cfg;
  env.dark = dark;
  env.observers.length = 0;
  _resetStoreForTest();
  await initStore();
}

describe('chat-store remote config merge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    env.theme = { primary: '#111111', secondary: '#222222' };
  });

  it('themes bubble, greet window and chatbar from the host theme', async () => {
    await boot({
      bubbleConfig: { useWebsiteTheme: true, outlineRing: { color: 'x' }, position: 'left' },
      greetWindowConfig: { useWebsiteTheme: true, inputBox: { layout: 'separated' } },
      chatbarConfig: { useWebsiteTheme: true, layout: 'card', cardOffsetRight: 5, cardOffsetBottom: 0 }
    });
    expect(bubbleStore.get().backgroundColor).toBe('#111111');
    expect(bubbleStore.get().outlineRing?.color).toBe('#222222');
    expect(greetWindowStore.get().position).toBe('left');
    expect(greetWindowStore.get().iconColor).toBe('#111111');
    expect(greetWindowStore.get().inputBox?.buttonIconColor).toBe('#111111');
    expect(chatbarStore.get().bgColor).toBe('#111111');
    expect(chatbarStore.get().offsetRight).toBe(5);
    expect(chatbarStore.get().offsetBottom).toBe(0);
  });

  it('falls back to the root accent colour without overwriting explicit colours', async () => {
    await boot({
      accentColor: '#abcdef',
      bubbleConfig: { outlineRing: {}, size: 3 },
      greetWindowConfig: { iconColor: 'keep', inputBox: { layout: 'joined', buttonColor: '' } },
      chatbarConfig: { layout: 'bar', barOffsetRight: 9 },
      chatConfig: { headerBg: 'mine' },
      featuresConfig: { prechatEnabled: true }
    });
    expect(bubbleStore.get().backgroundColor).toBe('#abcdef');
    expect(bubbleStore.get().outlineRing?.color).toBe('#abcdef');
    expect(greetWindowStore.get().iconColor).toBe('keep');
    expect(greetWindowStore.get().inputBox?.buttonColor).toBe('#abcdef');
    expect(chatbarStore.get().bgColor).toBe('#abcdef');
    expect(chatbarStore.get().offsetRight).toBe(9);
    expect(chatWindowStore.get().headerBg).toBe('mine');
    expect(chatWindowStore.get().accentColor).toBe('#abcdef');
    expect(chatWindowStore.get().inputFocusShadow).toBe('0 0 0 2px #abcdef26');
    expect(featuresStore.get().prechatEnabled).toBe(true);
  });

  it('applies the website theme to the chat window and re-themes when the host goes dark', async () => {
    await boot({ chatConfig: { useWebsiteTheme: true, dark: { inputBg: '#000' }, agentName: 'Ann', clientName: 'Acme' } });
    expect(chatWindowStore.get().headerBg).toBe('#111111');
    expect(chatWindowStore.get().welcome?.bgGradient).toContain('#111111');
    expect(chatStore.get().agentName).toBe('Ann');
    expect(chatStore.get().clientName).toBe('Acme');
    expect(chatStore.get().state).toBe('welcome');

    env.dark = true;
    env.observers.forEach((f) => f());
    expect(chatWindowStore.get().bodyBg).toBe('var(--cw-bg)');
    expect(chatWindowStore.get().inputBg).toBe('#000');
  });

  it('seeds the chat from the active remote welcome message', async () => {
    await boot({
      agentName: 'Raw',
      chatConfig: { clientName: 'x' },
      messages: [
        { key: 'other', body: 'o' },
        { key: 'welcome', body: 'w', senderType: 'BOT' }
      ]
    });
    const [msg] = chatStore.get().messages;
    expect(chatStore.get().messages).toHaveLength(1);
    expect(msg.body).toBe('w');
    expect(msg.senderType).toBe('BOT');
  });

  it('collapses injected multi-message tokens and keeps injected colours over the website theme', async () => {
    await boot({ chatConfig: { useWebsiteTheme: true } });
    injectStoreConfig({
      agentName: 'Tok',
      accentColor: '#123456',
      welcome: { enabled: true },
      chatWindow: { headerBg: '#f00' },
      messages: [
        { key: 'a', body: '1' },
        { key: 'welcome', body: '2' }
      ]
    });
    expect(chatStore.get().messages).toHaveLength(1);
    expect(chatStore.get().messages[0].body).toBe('2');
    expect(chatStore.get().agentName).toBe('Tok');
    expect(chatWindowStore.get().headerBg).toBe('#f00');
  });

  it('applies trigger type and scalar overrides', async () => {
    await boot({});
    updateStoreConfig({ triggerType: 'chatbar', enableGreetWindow: true, enableInputCard: true, greetDelaySec: 0 });
    expect(chatbarStore.get().enabled).toBe(true);
    expect(bubbleStore.get().enabled).toBe(false);
    updateStoreConfig({ triggerType: 'chatcard' });
    expect(chatbarStore.get().enabled).toBe(true);
    updateStoreConfig({ triggerType: 'bubble' });
    expect(bubbleStore.get().enabled).toBe(true);
    expect(chatbarStore.get().enabled).toBe(false);
  });
});
