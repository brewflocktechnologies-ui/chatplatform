import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../../../components/molecules/cw-attach-menu.js';
import { CwAttachMenu } from '../../../components/molecules/cw-attach-menu.js';

describe('CwAttachMenu Molecule Component', () => {
  let element: CwAttachMenu;

  beforeEach(async () => {
    document.body.innerHTML = '';
    element = new CwAttachMenu();
    document.body.appendChild(element);
    await element.updateComplete;
  });

  it('should instantiate and mount cw-attach-menu element', () => {
    expect(element).toBeDefined();
    expect(element.tagName.toLowerCase()).toBe('cw-attach-menu');
  });

  it('should render menu items for image upload and screenshot capture', () => {
    const items = element.shadowRoot?.querySelectorAll('cw-menu-item');
    expect(items).not.toBeNull();
    expect(items?.length).toBe(2);
  });

  it('should dispatch cw:trigger-file-select event on image menu item click', () => {
    const spy = vi.fn();
    element.addEventListener('cw:trigger-file-select', spy);

    const imageItem = element.shadowRoot?.querySelector('cw-menu-item[label="Send an image"]') as HTMLElement;
    imageItem?.click();

    expect(spy).toHaveBeenCalled();
  });

  it('should dispatch cw:capture-screenshot event on screenshot menu item click', () => {
    const spy = vi.fn();
    element.addEventListener('cw:capture-screenshot', spy);

    const screenshotItem = element.shadowRoot?.querySelector('cw-menu-item[label="Add screenshot"]') as HTMLElement;
    screenshotItem?.click();

    expect(spy).toHaveBeenCalled();
  });
});
