import { describe, it, expect, beforeEach } from 'vitest';
import '../../../components/atoms/cw-tooltip.js';
import { CwTooltip } from '../../../components/atoms/cw-tooltip.js';

describe('CwTooltip Atom Component', () => {
  let element: CwTooltip;

  beforeEach(async () => {
    document.body.innerHTML = '';
    element = new CwTooltip();
    document.body.appendChild(element);
    await element.updateComplete;
  });

  it('should instantiate and mount cw-tooltip element', () => {
    expect(element).toBeDefined();
    expect(element.tagName.toLowerCase()).toBe('cw-tooltip');
  });

  it('should render tooltip text and arrow for positions left, right, top, bottom with border', async () => {
    element.text = 'Need help?';
    element.visible = true;
    element.borderWidth = 1;
    element.borderColor = '#000000';

    const positions = ['left', 'right', 'top', 'bottom'] as const;
    for (const pos of positions) {
      element.position = pos;
      await element.updateComplete;

      const box = element.shadowRoot?.querySelector('.tooltip-box');
      expect(box).not.toBeNull();
      expect(box?.textContent?.trim()).toContain('Need help?');

      const arrow = element.shadowRoot?.querySelector('.tooltip-arrow');
      expect(arrow).not.toBeNull();
    }
  });

  it('handles arrowEnabled false, zero border width, and position/borderColor fallbacks', async () => {
    element.text = 'Tip';
    element.visible = true;
    element.borderWidth = 0;
    element.arrowEnabled = true;

    const positions = ['left', 'right', 'top', 'bottom'] as const;
    for (const pos of positions) {
      element.position = pos;
      await element.updateComplete;
      const arrow = element.shadowRoot?.querySelector('.tooltip-arrow');
      expect(arrow).not.toBeNull();
    }

    element.arrowEnabled = false;
    element.position = undefined as any;
    element.borderColor = undefined as any;
    await element.updateComplete;

    const box = element.shadowRoot?.querySelector('.tooltip-box');
    expect(box).not.toBeNull();

    const arrow = element.shadowRoot?.querySelector('.tooltip-arrow');
    expect(arrow).toBeNull();
  });

  it('should hide tooltip when visible is false or text is empty', async () => {
    element.visible = false;
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.tooltip-box')).toBeNull();

    element.visible = true;
    element.text = '';
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.tooltip-box')).toBeNull();
  });
});
