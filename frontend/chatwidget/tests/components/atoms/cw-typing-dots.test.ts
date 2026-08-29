import { describe, it, expect, beforeEach } from 'vitest';
import '../../../components/atoms/cw-typing-dots.js';
import { CwTypingDots } from '../../../components/atoms/cw-typing-dots.js';

describe('CwTypingDots Atom Component', () => {
  let element: CwTypingDots;

  beforeEach(async () => {
    document.body.innerHTML = '';
    element = new CwTypingDots();
    document.body.appendChild(element);
    await element.updateComplete;
  });

  it('should instantiate and mount cw-typing-dots element', () => {
    expect(element).toBeDefined();
    expect(element.tagName.toLowerCase()).toBe('cw-typing-dots');
  });

  it('should render 3 animated typing dots', async () => {
    const dots = element.shadowRoot?.querySelectorAll('.dot');
    expect(dots).not.toBeNull();
    expect(dots?.length).toBe(3);
  });
});
