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

describe('CwMessageBubble look and ticks', () => {
  const mount = async (props: Partial<CwMessageBubble>) => {
    document.body.innerHTML = '';
    const el = new CwMessageBubble();
    Object.assign(el, props);
    document.body.appendChild(el);
    await el.updateComplete;
    return el;
  };
  const bubble = (el: CwMessageBubble) => el.shadowRoot!.querySelector('.bubble') as HTMLElement;
  const tick = (el: CwMessageBubble) => el.shadowRoot!.querySelector('.bubble-time cw-icon') as any;
  const visitor = (extra: object = {}) => ({ senderType: 'VISITOR', body: 'Hi', created: '10:30', ...extra }) as never;
  const agent = (extra: object = {}) => ({ senderType: 'AGENT', body: 'Hello', created: '10:31', ...extra }) as never;

  it('renders nothing without a message', async () => {
    expect((await mount({})).shadowRoot!.querySelector('.bubble-row')).toBeNull();
  });

  it('styles visitor bubbles with the gradient and a soft glow, agent bubbles flat with a border', async () => {
    const v = bubble(await mount({ message: visitor() })).getAttribute('style')!;
    expect(v).toContain('linear-gradient(135deg');
    expect(v).toContain('box-shadow: 0 2px 8px rgba(11, 95, 255, 0.2)');
    expect(v).toContain('border-width: 0px');
    expect(v).toContain('border-color: transparent');

    const a = bubble(await mount({ message: agent() })).getAttribute('style')!;
    expect(a).toContain('background: #ffffff');
    expect(a).toContain('box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08)');
    expect(a).toContain('border-width: 1px');
  });

  it('uses the configured colours and drops the glow for a custom visitor background', async () => {
    const config = {
      visitorBubbleBg: 'navy',
      visitorBubbleColor: 'white',
      visitorBubbleBorderRadius: '4px',
      visitorBubblePadding: '2px',
      visitorBubbleFontSize: '16px',
      agentBubbleBg: 'beige',
      agentBubbleColor: 'black',
      agentBubbleBorderColor: 'tan',
      agentBubbleBoxShadow: '0 0 1px gray',
      agentBubbleBorderRadius: '8px',
      agentBubblePadding: '3px',
      agentBubbleFontSize: '12px'
    } as never;
    const v = bubble(await mount({ message: visitor(), chatWindowConfig: config })).getAttribute('style')!;
    for (const part of ['background: navy', 'color: white', 'box-shadow: none', 'border-radius: 4px', 'padding: 2px', 'font-size: 16px']) {
      expect(v).toContain(part);
    }
    const a = bubble(await mount({ message: agent(), chatWindowConfig: config })).getAttribute('style')!;
    for (const part of ['background: beige', 'color: black', 'border-color: tan', 'box-shadow: 0 0 1px gray', 'border-radius: 8px', 'padding: 3px', 'font-size: 12px']) {
      expect(a).toContain(part);
    }
  });

  it('shows the agent avatar on the last bubble of a group and a spacer otherwise', async () => {
    const config = { agentAvatarUrl: 'http://a/v.png', agentAvatarBg: 'teal', agentAvatarColor: 'white' } as never;
    const last = await mount({ message: agent({ senderName: 'Mia' }), chatWindowConfig: config, isGroupEnd: true });
    const avatar = last.shadowRoot!.querySelector('cw-avatar') as any;
    expect(avatar.src).toBe('http://a/v.png');
    expect(avatar.name).toBe('Mia');
    expect(avatar.bgColor).toBe('teal');
    expect(avatar.textColor).toBe('white');

    const nameless = await mount({ message: agent(), agentName: 'Bot', isGroupEnd: true });
    expect((nameless.shadowRoot!.querySelector('cw-avatar') as any).name).toBe('Bot');
    expect((await mount({ message: agent(), isGroupEnd: true })).shadowRoot!.querySelector<any>('cw-avatar').name).toBe('Agent');

    const middle = await mount({ message: agent(), isGroupEnd: false });
    expect(middle.shadowRoot!.querySelector('cw-avatar')).toBeNull();
    expect(middle.shadowRoot!.querySelector('.msg-avatar-placeholder')).not.toBeNull();

    const own = await mount({ message: visitor(), isGroupEnd: true });
    expect(own.shadowRoot!.querySelector('cw-avatar')).toBeNull();
    expect(own.shadowRoot!.querySelector('.msg-avatar-placeholder')).toBeNull();
  });

  it('picks the tick by delivery state: one check while pending or sent, two once delivered or read', async () => {
    const pending = tick(await mount({ message: visitor({ pending: true }) }));
    expect([pending.name, pending.size]).toEqual(['Check', 13]);
    const sent = tick(await mount({ message: visitor({ status: 'sent' }) }));
    expect([sent.name, sent.size]).toEqual(['Check', 13]);
    const delivered = tick(await mount({ message: visitor({ status: 'delivered' }) }));
    expect([delivered.name, delivered.size]).toEqual(['DoubleCheck', 14]);
    const read = tick(await mount({ message: visitor({ status: 'read', pending: true }) }));
    expect([read.name, read.size]).toEqual(['DoubleCheck', 13]);
  });

  it('colours and dims the tick: bright blue when read, the sent colour otherwise', async () => {
    const readEl = await mount({ message: visitor({ status: 'read' }) });
    expect(tick(readEl).color).toBe('#34b7f1');
    expect(tick(readEl).getAttribute('style')).toContain('opacity: 1');
    const sentEl = await mount({ message: visitor({ status: 'sent' }), chatWindowConfig: { sentTickColor: 'gray', readTickColor: 'blue' } as never });
    expect(tick(sentEl).color).toBe('gray');
    expect(tick(sentEl).getAttribute('style')).toContain('opacity: 0.75');
    expect(tick(await mount({ message: visitor({ status: 'sent' }) })).color).toBe('currentColor');
    expect(tick(await mount({ message: visitor({ status: 'read' }), chatWindowConfig: { readTickColor: 'blue' } as never })).color).toBe('blue');
  });

  it('hides ticks for agents, when disabled, and on bubbles that are not last in a group', async () => {
    expect(tick(await mount({ message: agent({ status: 'read' }) }))).toBeNull();
    expect(tick(await mount({ message: visitor(), chatWindowConfig: { ticksEnabled: false } as never }))).toBeNull();
    const middle = await mount({ message: visitor(), isGroupEnd: false });
    expect(middle.shadowRoot!.querySelector('.bubble-time')).toBeNull();
  });

  it('formats times: clock strings as-is, dates as a time, junk as-is', async () => {
    const time = async (created: string | undefined) =>
      (await mount({ message: agent({ created }) })).shadowRoot!.querySelector('.bubble-time')!.textContent!.trim();
    expect(await time('9:05 PM')).toBe('9:05 PM');
    expect(await time('10:30:15')).toBe('10:30:15');
    expect(await time(' 7:45 ')).toBe('7:45');
    expect(await time('not a time')).toBe('not a time');
    expect(await time('2024-03-04T13:45:00')).toMatch(/\d{1,2}:45/);
    expect(await time(undefined)).toMatch(/\d{1,2}:\d{2}/);
  });

  it('shows an attachment image that opens in a new tab unless still pending', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const el = await mount({ message: visitor({ attachment: true, url: 'http://f/x.png', body: '' }) });
    const img = el.shadowRoot!.querySelector('img.bubble-img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('http://f/x.png');
    expect(el.shadowRoot!.querySelector('.bubble > span:not(.bubble-time)')).toBeNull();
    img.click();
    expect(open).toHaveBeenCalledWith('http://f/x.png', '_blank');

    open.mockClear();
    const pending = await mount({ message: visitor({ localUrl: 'blob:local', pending: true }) });
    const pendingImg = pending.shadowRoot!.querySelector('img.bubble-img') as HTMLImageElement;
    expect(pendingImg.getAttribute('src')).toBe('blob:local');
    pendingImg.click();
    expect(open).not.toHaveBeenCalled();
    expect(bubble(pending).className).toContain('pending');
    open.mockRestore();
  });
});
