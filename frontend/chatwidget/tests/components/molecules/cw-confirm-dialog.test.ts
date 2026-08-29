import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../../../components/molecules/cw-confirm-dialog.js';
import { CwConfirmDialog } from '../../../components/molecules/cw-confirm-dialog.js';

describe('CwConfirmDialog Molecule Component', () => {
  let element: CwConfirmDialog;

  beforeEach(async () => {
    document.body.innerHTML = '';
    element = new CwConfirmDialog();
    document.body.appendChild(element);
    await element.updateComplete;
  });

  it('should instantiate and mount cw-confirm-dialog element', () => {
    expect(element).toBeDefined();
    expect(element.tagName.toLowerCase()).toBe('cw-confirm-dialog');
  });

  it('should render confirmation message and action buttons', async () => {
    element.message = 'Are you sure you want to exit?';
    element.cancelLabel = 'No, stay';
    element.confirmLabel = 'Yes, exit';
    await element.updateComplete;

    const msg = element.shadowRoot?.querySelector('.modal-message');
    expect(msg?.textContent?.trim()).toBe('Are you sure you want to exit?');

    const buttons = element.shadowRoot?.querySelectorAll('cw-button');
    expect(buttons?.length).toBe(2);
  });

  it('should dispatch cw:confirm-cancel event when cancel button is clicked', () => {
    const spy = vi.fn();
    element.addEventListener('cw:confirm-cancel', spy);

    const cancelBtn = element.shadowRoot?.querySelectorAll('cw-button')[0] as HTMLElement;
    cancelBtn?.click();

    expect(spy).toHaveBeenCalled();
  });

  it('should dispatch cw:confirm-end event when confirm button is clicked', () => {
    const spy = vi.fn();
    element.addEventListener('cw:confirm-end', spy);

    const confirmBtn = element.shadowRoot?.querySelectorAll('cw-button')[1] as HTMLElement;
    confirmBtn?.click();

    expect(spy).toHaveBeenCalled();
  });
});
