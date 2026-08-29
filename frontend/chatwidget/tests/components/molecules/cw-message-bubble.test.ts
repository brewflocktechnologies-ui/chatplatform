import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../../../components/molecules/cw-message-bubble.js';
import { CwMessageBubble } from '../../../components/molecules/cw-message-bubble.js';

describe('CwMessageBubble Molecule Component', () => {
  let element: CwMessageBubble;

  beforeEach(async () => {
    document.body.innerHTML = '';
    element = new CwMessageBubble();
    document.body.appendChild(element);
    await element.updateComplete;
  });

  it('should instantiate and mount cw-message-bubble element', () => {
    expect(element).toBeDefined();
    expect(element.tagName.toLowerCase()).toBe('cw-message-bubble');
  });

  it('should render visitor message bubble text', async () => {
    element.message = {
      key: '1',
      senderType: 'VISITOR',
      body: 'Hello support team',
      created: new Date().toISOString(),
    };
    await element.updateComplete;

    const span = element.shadowRoot?.querySelector('.bubble span');
    expect(span).not.toBeNull();
    expect(span?.textContent?.trim()).toBe('Hello support team');
  });

  it('should render agent message bubble text and avatar', async () => {
    element.message = {
      key: '2',
      senderType: 'AGENT',
      senderName: 'Sarah',
      body: 'Hi! How can I help?',
      created: new Date().toISOString(),
    };
    element.agentName = 'Sarah';
    await element.updateComplete;

    const span = element.shadowRoot?.querySelector('.bubble span');
    expect(span).not.toBeNull();
    expect(span?.textContent?.trim()).toBe('Hi! How can I help?');
  });

  it('should render image attachment and handle click to open full image', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    element.message = {
      key: '3',
      senderType: 'VISITOR',
      body: '',
      attachment: true,
      localUrl: 'blob:http://localhost/test-image.png',
      pending: false,
    };
    await element.updateComplete;

    const img = element.shadowRoot?.querySelector('.bubble-img') as HTMLImageElement;
    expect(img).not.toBeNull();
    img.click();

    expect(openSpy).toHaveBeenCalledWith('blob:http://localhost/test-image.png', '_blank');
  });

  it('handles empty message, non-group-end agent placeholder, pending attachment click, missing created date, and tick status branches', async () => {
    // 1. Empty message
    element.message = undefined as any;
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.bubble-row')).toBeNull();

    // 2. Agent with isGroupEnd = false
    element.message = { key: '4', senderType: 'AGENT', body: 'Grouped agent msg' };
    element.isGroupEnd = false;
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.msg-avatar-placeholder')).not.toBeNull();

    // 3. Pending attachment (should not call window.open)
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    element.message = { key: '5', senderType: 'VISITOR', attachment: true, url: 'https://example.com/img.jpg', pending: true };
    element.isGroupEnd = true;
    element.chatWindowConfig = {
      visitorBubbleBg: '#ff0000',
      sentTickColor: '#123456',
      readTickColor: '#654321',
      ticksEnabled: true,
    };
    await element.updateComplete;

    const img = element.shadowRoot?.querySelector('.bubble-img') as HTMLImageElement;
    expect(img).not.toBeNull();
    openSpy.mockClear();
    img.click();
    expect(openSpy).not.toHaveBeenCalled();

    // 4. Tick status = 'sent' and 'read' and ticksEnabled = false
    element.message = { key: '6', senderType: 'VISITOR', body: 'Msg', status: 'read', created: '2026-01-01T00:00:00Z' };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('cw-icon')).not.toBeNull();

    element.message = { key: '7', senderType: 'VISITOR', body: 'Msg', status: 'sent', created: '2026-01-01T00:00:00Z' };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('cw-icon')).not.toBeNull();

    // 5. Non-pending attachment with m.url (no localUrl) and agentAvatarUrl
    element.message = { key: '8', senderType: 'AGENT', attachment: true, url: 'https://example.com/remote.png', pending: false };
    element.isGroupEnd = true;
    element.chatWindowConfig = { agentAvatarUrl: 'https://example.com/avatar.png' };
    await element.updateComplete;

    const imgRemote = element.shadowRoot?.querySelector('.bubble-img') as HTMLImageElement;
    expect(imgRemote).not.toBeNull();
    openSpy.mockClear();
    imgRemote.click();
    expect(openSpy).toHaveBeenCalledWith('https://example.com/remote.png', '_blank');

    // 6. Attachment with neither localUrl nor url
    element.message = { key: '9', senderType: 'VISITOR', attachment: true, pending: false };
    await element.updateComplete;
    const imgEmpty = element.shadowRoot?.querySelector('.bubble-img') as HTMLImageElement;
    expect(imgEmpty).not.toBeNull();
    openSpy.mockClear();
    imgEmpty.click();
    expect(openSpy).toHaveBeenCalledWith('', '_blank');
  });
});
