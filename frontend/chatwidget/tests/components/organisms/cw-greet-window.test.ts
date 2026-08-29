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
