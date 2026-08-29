import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../../../components/organisms/cw-chat-header.js';
import { CwChatHeader } from '../../../components/organisms/cw-chat-header.js';

describe('CwChatHeader Organism Component', () => {
  let element: CwChatHeader;

  beforeEach(async () => {
    document.body.innerHTML = '';
    element = new CwChatHeader();
    document.body.appendChild(element);
    await element.updateComplete;
  });

  it('should instantiate and mount cw-chat-header element', () => {
    expect(element).toBeDefined();
    expect(element.tagName.toLowerCase()).toBe('cw-chat-header');
  });

  it('should render agent & client title text', async () => {
    element.clientName = 'Acme Corp';
    element.agentName = 'Sarah';
    await element.updateComplete;

    const title = element.shadowRoot?.querySelector('.title-text');
    expect(title?.textContent?.trim()).toContain('Acme Corp');
  });

  it('handles non-active state and modernUi false layout', async () => {
    element.state = 'offline';
    element.config = { modernUi: false, headerTextColor: '#18181b', headerBorderColor: '#e4e4e7' };
    await element.updateComplete;

    const subtitle = element.shadowRoot?.querySelector('.subtitle-text');
    expect(subtitle?.textContent?.trim()).toBe('Online');
  });

  it('should dispatch header events (expand, menu, end-chat, voice, video, close)', async () => {
    const expandSpy = vi.fn();
    const menuSpy = vi.fn();
    const endSpy = vi.fn();
    const voiceSpy = vi.fn();
    const videoSpy = vi.fn();
    const closeSpy = vi.fn();

    element.addEventListener('cw:toggle-expand', expandSpy);
    element.addEventListener('cw:open-menu', menuSpy);
    element.addEventListener('cw:end-chat', endSpy);
    element.addEventListener('cw:voice-call', voiceSpy);
    element.addEventListener('cw:video-call', videoSpy);
    element.addEventListener('cw:close-panel', closeSpy);

    element.config = {
      modernUi: true,
      features: {
        voiceCallEnabled: true,
        videoCallEnabled: true,
        closeChatVisitor: true,
      },
    };
    element.features = {
      voiceCallEnabled: true,
      videoCallEnabled: true,
      closeChatVisitor: true,
    };
    await element.updateComplete;

    const buttons = element.shadowRoot?.querySelectorAll('cw-button');
    buttons?.forEach((btn) => btn.click());

    expect(expandSpy).toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('renders empty when state is welcome', async () => {
    element.state = 'welcome';
    element.config = { welcome: { enabled: true } };
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('header')).toBeNull();
  });

  it('handles state = welcome with welcome.enabled = false, empty state, and agentName/clientName fallbacks', async () => {
    // 1. state = welcome with welcome.enabled = false (falls back to active)
    element.state = 'welcome';
    element.config = { welcome: { enabled: false } };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('header')).not.toBeNull();

    // 2. empty state, agentName fallback from config, clientName fallback
    element.state = '' as any;
    element.agentName = '';
    element.clientName = '';
    element.config = { agentName: 'SupportBot', clientName: 'HelpDesk' };
    await element.updateComplete;
    let title = element.shadowRoot?.querySelector('.title-text');
    let subtitle = element.shadowRoot?.querySelector('.subtitle-text');
    expect(title?.textContent?.trim()).toBe('HelpDesk');
    expect(subtitle?.textContent?.trim()).toBe('SupportBot · Online');

    // 3. agentName & clientName empty fallbacks
    element.config = {};
    await element.updateComplete;
    title = element.shadowRoot?.querySelector('.title-text');
    subtitle = element.shadowRoot?.querySelector('.subtitle-text');
    expect(title?.textContent?.trim()).toBe('Support');
    expect(subtitle?.textContent?.trim()).toBe('Online');
  });

  it('handles isExpanded true, voiceCallMaster / videoCallMaster / cw.features fallback, and header styling props', async () => {
    element.isExpanded = true;
    element.state = 'active';
    element.agentName = 'Sarah';
    element.clientName = 'Acme';
    element.config = {
      headerBg: '#000000',
      headerPadding: '10px',
      headerBorderColor: '#333333',
      headerAvatarBg: '#111111',
      headerAvatarColor: '#ffffff',
      headerTitleFontSize: '16px',
      headerSubtitleFontSize: '12px',
      activeDot: true,
      features: {
        voiceCallMaster: true,
        videoCallMaster: true,
        closeChatVisitor: true,
      },
    };
    element.features = {
      voiceCallMaster: true,
      videoCallMaster: true,
    };
    await element.updateComplete;

    const expandBtn = element.shadowRoot?.querySelector('.expand-btn cw-button');
    expect((expandBtn as any)?.label).toBe('Collapse chat');

    const voiceBtn = element.shadowRoot?.querySelector('cw-button[label="Start voice call"]');
    expect(voiceBtn).not.toBeNull();

    const videoBtn = element.shadowRoot?.querySelector('cw-button[label="Start video call"]');
    expect(videoBtn).not.toBeNull();
  });
});
