import { describe, it, expect, beforeEach } from 'vitest';
import '../../../components/atoms/cw-icon.js';
import { CwIcon } from '../../../components/atoms/cw-icon.js';

describe('CwIcon Atom Component', () => {
  let element: CwIcon;

  beforeEach(async () => {
    document.body.innerHTML = '';
    element = new CwIcon();
    document.body.appendChild(element);
    await element.updateComplete;
  });

  it('should instantiate and mount cw-icon element', () => {
    expect(element).toBeDefined();
    expect(element.tagName.toLowerCase()).toBe('cw-icon');
  });

  it('should render correct SVG for named icon', async () => {
    element.name = 'Sparkles';
    element.size = 28;
    element.color = '#0b5fff';
    await element.updateComplete;

    const svg = element.shadowRoot?.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('width')).toBe('28');
    expect(svg?.getAttribute('height')).toBe('28');
  });

  it('should support custom inline SVG string rendering', async () => {
    element.customSvg = '<svg class="custom-test"><circle cx="12" cy="12" r="10"></circle></svg>';
    await element.updateComplete;

    const customDiv = element.shadowRoot?.querySelector('.custom-svg');
    expect(customDiv).not.toBeNull();
    expect(customDiv?.innerHTML).toContain('custom-test');
  });

  it('should sanitize malicious custom inline SVG string rendering', async () => {
    element.customSvg = '<svg onload="alert(1)"><script>alert(2)</script><circle cx="12" cy="12" r="10" onclick="alert(3)"></circle></svg>';
    await element.updateComplete;

    const customDiv = element.shadowRoot?.querySelector('.custom-svg');
    expect(customDiv?.innerHTML).not.toContain('<script');
    expect(customDiv?.innerHTML).not.toContain('onload');
    expect(customDiv?.innerHTML).not.toContain('onclick');
  });

  it('falls back to named icon rendering if customSvg is invalid', async () => {
    element.name = 'Smile';
    element.customSvg = 'not-an-svg-string';
    await element.updateComplete;

    const svg = element.shadowRoot?.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('renders all icon switch cases', async () => {
    const names = [
      'Star', 'Heart', 'Smile', 'Sparkles', 'MessageSquare', 'Send', 'SendFilled',
      'PaperPlane', 'ArrowUp', 'HelpCircle', 'Gift', 'Bell', 'Info', 'AlertCircle',
      'Minimize2', 'Contract', 'Maximize2', 'Expand', 'Phone', 'Video', 'Power',
      'MoreHorizontal', 'Close', 'X', 'Plus', 'ChevronDown', 'RotateCw', 'Rotate',
      'ChatLines', 'Check', 'DoubleCheck', 'Image', 'Camera', 'Crop', 'Download',
      'Volume2', 'MessageCircle', 'UnknownDefault'
    ];

    for (const name of names) {
      element.name = name;
      await element.updateComplete;
      const svg = element.shadowRoot?.querySelector('svg');
      expect(svg).not.toBeNull();
    }
  });
});
