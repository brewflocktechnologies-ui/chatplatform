import { describe, it, expect, beforeEach } from 'vitest';
import '../../../components/atoms/cw-menu-item.js';
import { CwMenuItem } from '../../../components/atoms/cw-menu-item.js';

describe('CwMenuItem Atom Component', () => {
  let element: CwMenuItem;

  beforeEach(async () => {
    document.body.innerHTML = '';
    element = new CwMenuItem();
    document.body.appendChild(element);
    await element.updateComplete;
  });

  it('should instantiate and mount cw-menu-item element', () => {
    expect(element).toBeDefined();
    expect(element.tagName.toLowerCase()).toBe('cw-menu-item');
  });

  it('should render label text and icon', async () => {
    element.label = 'Download transcript';
    element.icon = 'Download';
    await element.updateComplete;

    const btn = element.shadowRoot?.querySelector('button');
    expect(btn).not.toBeNull();

    const labelSpan = element.shadowRoot?.querySelector('.label-text');
    expect(labelSpan?.textContent?.trim()).toBe('Download transcript');

    const icon = element.shadowRoot?.querySelector('cw-icon');
    expect(icon).not.toBeNull();
  });
});
