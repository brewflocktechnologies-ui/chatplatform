import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../../../components/organisms/cw-greet-window.js';
import { CwGreetWindow } from '../../../components/organisms/cw-greet-window.js';

describe('CwGreetWindow Organism Component', () => {
  let element: CwGreetWindow;

  beforeEach(async () => {
    document.body.innerHTML = '';
    element = new CwGreetWindow();
    element.config = {
      enabled: true,
      dismissed: false,
      visible: true,
      useWebsiteTheme: false,
      width: 320,
      spacing: 16,
      backgroundColor: '#ffffff',
      borderRadius: 16,
      padding: '24px 20px',
      boxShadow: '0 12px 28px rgba(0,0,0,0.15)',
      imageUrl: '',
      imageHeight: 70,
      imageWidth: '',
      iconAlign: 'center',
      imagePadding: '0px',
      iconType: 'lucide',
      lucideIcon: 'Sparkles',
      iconSize: 52,
      iconColor: '#0b5fff',
      iconAnimation: 'wiggle',
      iconAnimationDuration: '2.5s',
      title: 'Hi there! 👋 How can we help?',
      titleColor: '#1e293b',
      titleFontSize: '15px',
      description: 'Let us chat!',
      descriptionColor: '#475569',
      descriptionFontSize: '14px',
    };
    element.visible = true;
    element.panelOpen = false;
    element.dismissed = false;
    document.body.appendChild(element);
    await element.updateComplete;
  });

  it('should instantiate and mount cw-greet-window element', () => {
    expect(element).toBeDefined();
    expect(element.tagName.toLowerCase()).toBe('cw-greet-window');
  });

  it('should render title and description when visible and not dismissed', async () => {
    element.visible = true;
    await element.updateComplete;

    const title = element.shadowRoot?.querySelector('h3');
    expect(title?.textContent?.trim()).toContain('Hi there!');
  });

  it('should dispatch cw:greet-dismiss on close button click and cw:toggle on card click', async () => {
    element.visible = true;
    const dismissSpy = vi.fn();
    const toggleSpy = vi.fn();

    element.addEventListener('cw:greet-dismiss', dismissSpy);
    element.addEventListener('cw:toggle', toggleSpy);
    await element.updateComplete;

    const closeBtn = element.shadowRoot?.querySelector('cw-button[label="Close greet window"]') as HTMLElement;
    closeBtn?.click();
    expect(dismissSpy).toHaveBeenCalled();

    const card = element.shadowRoot?.querySelector('.greet-card') as HTMLElement;
    card?.click();
    expect(toggleSpy).toHaveBeenCalled();
  });

  it('renders image URL and input box when configured', async () => {
    element.config = {
      ...element.config!,
      imageUrl: 'http://example.com/greet.png',
      inputBox: { enabled: true, placeholder: 'Reply here' },
    };
    element.visible = true;
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('img')).not.toBeNull();
    expect(element.shadowRoot?.querySelector('cw-greet-input')).not.toBeNull();
  });

  it('triggers transition enterMs and leaveMs callbacks on visibility toggles', async () => {
    expect((element as any).transition.enterMs()).toBe(300);
    expect((element as any).transition.leaveMs()).toBe(300);

    vi.useFakeTimers();
    element.visible = false;
    await element.updateComplete;

    element.visible = true;
    await element.updateComplete;
    vi.advanceTimersByTime(400);

    element.visible = false;
    await element.updateComplete;
    vi.advanceTimersByTime(400);

    vi.useRealTimers();
  });

  it('handles bubble/chatbar hideOnOpen branches, iconAlign positions, default fallbacks, and fixed = false', async () => {
    // 1. chatbarConfig enabled = true & hideOnOpen = false
    element.chatbarConfig = { enabled: true, hideOnOpen: false };
    element.panelOpen = true;
    element.visible = true;
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.greet-wrapper')).not.toBeNull();

    // 2. bubbleConfig enabled (chatbar disabled) & hideOnOpen = false
    element.chatbarConfig = undefined;
    element.bubbleConfig = { hideOnOpen: false };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.greet-wrapper')).not.toBeNull();

    // 3. hasSentMessage = true & dismissed = true
    element.hasSentMessage = true;
    await element.updateComplete;
    expect((element as any).transition.phase).toBe('leave');

    element.hasSentMessage = false;
    element.dismissed = true;
    await element.updateComplete;
    expect((element as any).transition.phase).toBe('leave');

    // 4. fixed = false, iconAlign left and right, imageWith width, animationOpening/ClosingSec
    element.dismissed = false;
    element.fixed = false;
    element.bottomPx = 20;
    element.rightPx = 20;
    element.maxHeightPx = '400px';
    element.config = {
      enabled: true,
      visible: true,
      animationOpeningSec: 0.1,
      animationClosingSec: 0.1,
      iconAlign: 'left',
      imageUrl: 'http://example.com/img.png',
      imageWidth: 60,
      imageHeight: 60,
      imagePadding: '4px',
      inputBox: { enabled: true, visible: false },
    };
    await element.updateComplete;

    const wrapper = element.shadowRoot?.querySelector('.greet-wrapper') as HTMLElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper.style.position).toBe('absolute');

    // 5. iconAlign right & description without descriptionColor & image fallbacks
    element.config = {
      enabled: true,
      visible: true,
      iconAlign: 'right',
      title: 'Hello',
      description: 'World',
      imageUrl: 'http://example.com/img.png',
    };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.greet-card')).not.toBeNull();

    // 6. config = undefined while transition.render = true for enter, leave, and open phases
    element.config = undefined as any;
    (element as any).transition._target = true;
    (element as any).transition._render = true;

    for (const phase of ['enter', 'leave', 'open'] as const) {
      (element as any).transition._phase = phase;
      element.requestUpdate();
      await element.updateComplete;
    }
    expect(element.shadowRoot?.querySelector('.greet-wrapper')).toBeNull();

    // 7. hideOnOpen fallbacks (cb/bb hideOnOpen undefined)
    element.config = { enabled: true, visible: true };
    element.chatbarConfig = { enabled: true };
    element.panelOpen = true;
    await element.updateComplete;

    element.chatbarConfig = undefined;
    element.bubbleConfig = {};
    element.panelOpen = true;
    await element.updateComplete;
  });
});

describe('CwGreetWindow layout and content', () => {
  const mount = async (config: object | undefined, props: Partial<CwGreetWindow> = {}, phase?: 'enter' | 'open' | 'leave') => {
    document.body.innerHTML = '';
    const el = new CwGreetWindow();
    el.config = config as never;
    Object.assign(el, { visible: true, ...props });
    document.body.appendChild(el);
    await el.updateComplete;
    if (phase) {
      // Skip the animation frames: put the transition controller straight into the phase under test.
      (el as any).transition._phase = phase;
      el.requestUpdate();
      await el.updateComplete;
    }
    return el;
  };
  const q = (el: CwGreetWindow, sel: string) => el.shadowRoot!.querySelector(sel) as HTMLElement | null;
  const wrapper = (el: CwGreetWindow) => q(el, '.greet-wrapper')!.getAttribute('style')!;
  const base = { enabled: true, dismissed: false, title: 'Hello' };

  it('renders nothing without a config', async () => {
    expect(q(await mount(undefined), '.greet-wrapper')).toBeNull();
  });

  it('animates in, open and out with the configured durations', async () => {
    const config = { ...base, animationOpeningSec: 0.6, animationClosingSec: 0.2 };
    const entering = wrapper(await mount(config, {}, 'enter'));
    expect(entering).toContain('opacity: 0');
    expect(entering).toContain('translateY(16px)');
    expect(entering).toContain('opacity 0.6s ease, transform 0.6s ease');
    expect(entering).toContain('transition-delay: 150ms');

    const open = wrapper(await mount(config, {}, 'open'));
    expect(open).toContain('opacity: 1');
    expect(open).toContain('translateY(0)');
    expect(open).toContain('transition-delay: 0ms');

    const leaving = wrapper(await mount(config, {}, 'leave'));
    expect(leaving).toContain('opacity: 0');
    expect(leaving).toContain('opacity 0.2s ease, transform 0.2s ease');
    expect(leaving).toContain('transition-delay: 0ms');
  });

  it('defaults the durations to 0.3s but treats zero as a real value', async () => {
    expect(wrapper(await mount(base, {}, 'open'))).toContain('opacity 0.3s ease, transform 0.3s ease');
    expect(wrapper(await mount({ ...base, animationOpeningSec: 0 }, {}, 'open'))).toContain('opacity 0s ease, transform 0s ease');
    expect(wrapper(await mount({ ...base, animationClosingSec: 0 }, {}, 'leave'))).toContain('opacity 0s ease, transform 0s ease');
  });

  it('positions the window from its offsets, size and container mode', async () => {
    const defaults = wrapper(await mount(base, {}, 'open'));
    expect(defaults).toContain('bottom: 12px; right: 16px; width: 320px');
    expect(defaults).toContain('max-height: calc(100% - 36px)');
    expect(defaults).toContain('position: fixed');
    expect(wrapper(await mount({ ...base, width: 400 }, { bottomPx: 30, rightPx: 40, maxHeightPx: '300px' }, 'open'))).toContain(
      'bottom: 30px; right: 40px; width: 400px; max-width: calc(100% - 24px); max-height: 300px'
    );
    expect(wrapper(await mount(base, { bottomPx: 0, rightPx: 0 }, 'open'))).toContain('bottom: 0px; right: 0px');
    expect(wrapper(await mount(base, { fixed: false }, 'open'))).toContain('position: absolute');
  });

  it('aligns the icon area left, right or centred', async () => {
    const align = async (iconAlign?: string) =>
      (await mount({ ...base, iconAlign }, {}, 'open')).shadowRoot!.querySelector('div[style*="margin-bottom: 16px"]')!.getAttribute('style');
    expect(await align('left')).toContain('justify-content: flex-start');
    expect(await align('right')).toContain('justify-content: flex-end');
    expect(await align('center')).toContain('justify-content: center');
    expect(await align(undefined)).toContain('justify-content: center');
    expect(await align('sideways')).toContain('justify-content: center');
    expect(await align('constructor')).toContain('justify-content: center');
  });

  it('shows the greeting image with sensible defaults, centred only when the icon is', async () => {
    const img = q(await mount({ ...base, imageUrl: 'http://i/a.png' }, {}, 'open'), 'img')!;
    expect(img.getAttribute('alt')).toBe('Greeting image');
    expect(img.getAttribute('style')).toContain('height: 70px; width: auto');
    expect(img.getAttribute('style')).toContain('padding: 0px');
    expect(img.getAttribute('style')).toContain('margin: 0;');

    const custom = q(
      await mount({ ...base, imageUrl: 'http://i/a.png', imageAlt: 'Mascot', imageHeight: 90, imageWidth: '120', imagePadding: '4px', iconAlign: 'center' }, {}, 'open'),
      'img'
    )!;
    expect(custom.getAttribute('alt')).toBe('Mascot');
    expect(custom.getAttribute('style')).toContain('height: 90px; width: 120px');
    expect(custom.getAttribute('style')).toContain('padding: 4px');
    expect(custom.getAttribute('style')).toContain('margin: 0 auto');
  });

  it('falls back to a named icon when there is no image', async () => {
    const el = await mount({ ...base, iconColor: 'red' }, {}, 'open');
    const icon = q(el, 'cw-icon') as any;
    expect([icon.name, icon.size]).toEqual(['Sparkles', 48]);
    expect(q(el, 'img')).toBeNull();
    expect(icon.parentElement!.getAttribute('style')).toContain('color: red');
    const custom = q(await mount({ ...base, lucideIcon: 'Star', iconSize: 30 }, {}, 'open'), 'cw-icon') as any;
    expect([custom.name, custom.size]).toEqual(['Star', 30]);
  });

  it('shows the title always, and the description only when there is one', async () => {
    const plain = await mount({ enabled: true }, {}, 'open');
    expect(q(plain, 'h3')!.textContent!.trim()).toBe('Hi there! 👋');
    expect(q(plain, 'p')).toBeNull();
    const full = await mount({ ...base, description: 'Ask us anything', textAlign: 'left', fontSize: 20, titleColor: 'navy', descriptionColor: 'gray' }, {}, 'open');
    expect(q(full, 'p')!.textContent!.trim()).toBe('Ask us anything');
    expect(q(full, 'p')!.getAttribute('style')).toContain('color: gray');
    expect(q(full, 'h3')!.getAttribute('style')).toContain('font-size: 20px');
    expect(q(full, 'h3')!.getAttribute('style')).toContain('color: navy');
    expect(q(full, 'h3')!.parentElement!.getAttribute('style')).toContain('text-align: left');
  });

  it('shows the input box only when enabled, visible unless it asks to be hidden', async () => {
    expect(q(await mount(base, {}, 'open'), 'cw-greet-input')).toBeNull();
    expect(q(await mount({ ...base, inputBox: { enabled: false } }, {}, 'open'), 'cw-greet-input')).toBeNull();

    const shown = q(await mount({ ...base, iconColor: 'teal', inputBox: { enabled: true } }, {}, 'open'), 'cw-greet-input') as any;
    expect([shown.visible, shown.accentColor]).toEqual([true, 'teal']);
    expect((q(await mount({ ...base, inputBox: { enabled: true, visible: false } }, {}, 'open'), 'cw-greet-input') as any).visible).toBe(false);
    expect((q(await mount({ ...base, inputBox: { enabled: true } }, { visible: false }, 'open'), 'cw-greet-input') as any).visible).toBe(false);
    expect((q(await mount({ ...base, inputBox: { enabled: true } }, {}, 'open'), 'cw-greet-input') as any).accentColor).toBe('var(--cw-accent, #0b5fff)');
  });
});
