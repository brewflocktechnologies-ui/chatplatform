import { describe, it, expect, beforeEach } from 'vitest';
import '../../../components/molecules/cw-chat-footer.js';
import { CwChatFooter } from '../../../components/molecules/cw-chat-footer.js';

describe('CwChatFooter Molecule Component', () => {
  let element: CwChatFooter;

  beforeEach(async () => {
    document.body.innerHTML = '';
    element = new CwChatFooter();
    document.body.appendChild(element);
    await element.updateComplete;
  });

  it('should instantiate and mount cw-chat-footer element', () => {
    expect(element).toBeDefined();
    expect(element.tagName.toLowerCase()).toBe('cw-chat-footer');
  });

  it('should render powered by branding text and link', async () => {
    element.poweredByText = 'Acme AI';
    element.poweredByLink = 'https://acme.ai';
    element.poweredByColor = '#0b5fff';
    element.modernUi = false;
    element.footerFontSize = 12;
    element.footerPaddingBottom = 10;
    await element.updateComplete;

    const link = element.shadowRoot?.querySelector('.powered a');
    expect(link).not.toBeNull();
    expect(link?.textContent?.trim()).toBe('Acme AI');
    expect(link?.getAttribute('href')).toBe('https://acme.ai');
  });

  it('should test formatPx helper with various input types', async () => {
    element.footerFontSize = '14' as any;
    element.footerPaddingBottom = '20px' as any;
    await element.updateComplete;

    const powered = element.shadowRoot?.querySelector('.powered') as HTMLElement;
    expect(powered.style.fontSize).toBe('14px');
  });
});
