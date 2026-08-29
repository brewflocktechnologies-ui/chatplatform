import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../../../components/molecules/cw-welcome-cta.js';
import { CwWelcomeCta } from '../../../components/molecules/cw-welcome-cta.js';

describe('CwWelcomeCta Molecule Component', () => {
  let element: CwWelcomeCta;

  beforeEach(async () => {
    document.body.innerHTML = '';
    element = new CwWelcomeCta();
    document.body.appendChild(element);
    await element.updateComplete;
  });

  it('should instantiate and mount cw-welcome-cta element', () => {
    expect(element).toBeDefined();
    expect(element.tagName.toLowerCase()).toBe('cw-welcome-cta');
  });

  it('should render CTA button with configured text', async () => {
    element.config = {
      buttonText: 'Start Conversation',
      buttonBg: '#ffffff',
      buttonTextColor: '#000000',
    };
    await element.updateComplete;

    const btn = element.shadowRoot?.querySelector('cw-button');
    expect(btn).not.toBeNull();
  });

  it('should dispatch cw:start-chat event on click', async () => {
    const spy = vi.fn();
    element.addEventListener('cw:start-chat', spy);
    await element.updateComplete;

    const btn = element.shadowRoot?.querySelector('cw-button') as HTMLElement;
    btn?.click();

    expect(spy).toHaveBeenCalled();
  });
});
