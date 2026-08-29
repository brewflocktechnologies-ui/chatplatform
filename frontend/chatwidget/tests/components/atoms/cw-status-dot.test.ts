import { describe, it, expect, beforeEach } from 'vitest';
import '../../../components/atoms/cw-status-dot.js';
import { CwStatusDot } from '../../../components/atoms/cw-status-dot.js';

describe('CwStatusDot Atom Component', () => {
  let element: CwStatusDot;

  beforeEach(async () => {
    document.body.innerHTML = '';
    element = new CwStatusDot();
    document.body.appendChild(element);
    await element.updateComplete;
  });

  it('should instantiate and mount cw-status-dot element', () => {
    expect(element).toBeDefined();
    expect(element.tagName.toLowerCase()).toBe('cw-status-dot');
  });

  it('should render solid dot and pulse ring when animated', async () => {
    element.size = 10;
    element.color = '#22c55e';
    element.animated = true;
    await element.updateComplete;

    const wrapper = element.shadowRoot?.querySelector('.dot-wrapper');
    expect(wrapper).not.toBeNull();

    const pulse = element.shadowRoot?.querySelector('.dot-pulse');
    expect(pulse).not.toBeNull();

    const solid = element.shadowRoot?.querySelector('.dot-solid');
    expect(solid).not.toBeNull();
  });

  it('should hide pulse ring when animated is false', async () => {
    element.animated = false;
    await element.updateComplete;

    const pulse = element.shadowRoot?.querySelector('.dot-pulse');
    expect(pulse).toBeNull();
  });
});
