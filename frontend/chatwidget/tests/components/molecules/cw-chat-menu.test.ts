import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../../../components/molecules/cw-chat-menu.js';
import { CwChatMenu } from '../../../components/molecules/cw-chat-menu.js';

describe('CwChatMenu Molecule Component', () => {
  let element: CwChatMenu;

  beforeEach(async () => {
    document.body.innerHTML = '';
    element = new CwChatMenu();
    document.body.appendChild(element);
    await element.updateComplete;
  });

  it('should instantiate and mount cw-chat-menu element', () => {
    expect(element).toBeDefined();
    expect(element.tagName.toLowerCase()).toBe('cw-chat-menu');
  });

  it('should render menu items for download transcript and toggle sounds', async () => {
    element.soundsOn = true;
    await element.updateComplete;

    const items = element.shadowRoot?.querySelectorAll('cw-menu-item');
    expect(items?.length).toBe(2);

    const soundItem = element.shadowRoot?.querySelector('cw-menu-item[icon="Volume2"]');
    expect(soundItem?.getAttribute('label')).toBe('Sounds: ON');
  });

  it('should dispatch cw:download-transcript event on download item click', () => {
    const spy = vi.fn();
    element.addEventListener('cw:download-transcript', spy);

    const downloadItem = element.shadowRoot?.querySelector('cw-menu-item[icon="Download"]') as HTMLElement;
    downloadItem?.click();

    expect(spy).toHaveBeenCalled();
  });

  it('should dispatch cw:toggle-sounds event on sound item click', async () => {
    element.soundsOn = false;
    await element.updateComplete;

    const spy = vi.fn();
    element.addEventListener('cw:toggle-sounds', spy);

    const soundItem = element.shadowRoot?.querySelector('cw-menu-item[icon="Volume2"]') as HTMLElement;
    soundItem?.click();

    expect(spy).toHaveBeenCalled();
  });
});
