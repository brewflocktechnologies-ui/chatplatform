import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../../../components/organisms/cw-chat-form.js';
import { CwChatForm } from '../../../components/organisms/cw-chat-form.js';

describe('CwChatForm Organism Component', () => {
  let element: CwChatForm;

  beforeEach(async () => {
    document.body.innerHTML = '';
    element = new CwChatForm();
    element.schema = {
      id: 'prechat',
      title: 'Pre-Chat Form',
      subtitle: 'Please introduce yourself',
      submitLabel: 'Start Chatting',
      fields: [
        { name: 'name', type: 'text', label: 'Full Name', required: true },
        { name: 'email', type: 'email', label: 'Email', required: true },
      ],
    };
    document.body.appendChild(element);
    await element.updateComplete;
  });

  it('should instantiate and mount cw-chat-form element', () => {
    expect(element).toBeDefined();
    expect(element.tagName.toLowerCase()).toBe('cw-chat-form');
  });

  it('should render form header and form fields', () => {
    const title = element.shadowRoot?.querySelector('.form-title');
    expect(title?.textContent?.trim()).toBe('Pre-Chat Form');

    const fields = element.shadowRoot?.querySelectorAll('cw-form-field');
    expect(fields?.length).toBe(2);
  });

  it('handles empty schema, submitting state, and disabled state', async () => {
    element.schema = undefined as any;
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.form-wrapper')).toBeNull();

    element.schema = { id: 'test', title: 'Test', submitLabel: 'Submit', fields: [] };
    element.submitting = true;
    await element.updateComplete;

    const btn = element.shadowRoot?.querySelector('cw-button');
    expect(btn?.label).toBe('Submitting…');

    const spy = vi.fn();
    element.addEventListener('cw:form-submit', spy);
    (element as any).handleSubmit();
    expect(spy).not.toHaveBeenCalled();
  });

  it('should validate required fields and email format on submit', async () => {
    const spy = vi.fn();
    element.addEventListener('cw:form-submit', spy);

    // Click submit with empty values (fails validation)
    const submitBtn = element.shadowRoot?.querySelector('cw-button') as HTMLElement;
    submitBtn?.click();
    expect(spy).not.toHaveBeenCalled();

    // Field change with invalid email
    const field = element.shadowRoot?.querySelector('cw-form-field') as HTMLElement;
    field.dispatchEvent(new CustomEvent('cw:field-change', { detail: { name: 'email', value: 'invalid-email' } }));
    await element.updateComplete;

    submitBtn?.click();
    expect(spy).not.toHaveBeenCalled();

    // Valid values
    element.values = { name: 'John Doe', email: 'john@example.com' };
    await element.updateComplete;

    submitBtn?.click();
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ detail: { formId: 'prechat', values: { name: 'John Doe', email: 'john@example.com' } } })
    );
  });

  it('handles handleSubmit event preventDefault, disabled state submit, error clearing on field change, and missing subtitle', async () => {
    // 1. handleSubmit event preventDefault
    const mockEvent = { preventDefault: vi.fn() };
    element.values = { name: 'Jane', email: 'jane@example.com' };
    await element.updateComplete;
    (element as any).handleSubmit(mockEvent);
    expect(mockEvent.preventDefault).toHaveBeenCalled();

    // 2. disabled state submit
    element.disabled = true;
    const submitSpy = vi.fn();
    element.addEventListener('cw:form-submit', submitSpy);
    (element as any).handleSubmit();
    expect(submitSpy).not.toHaveBeenCalled();

    // 3. Error clearing on field change & errors prop sync & no-error field change
    element.disabled = false;
    element.errors = { name: 'Name error' };
    await element.updateComplete;

    const field = element.shadowRoot?.querySelector('cw-form-field') as HTMLElement;
    // Field change when error exists (clears error)
    field.dispatchEvent(new CustomEvent('cw:field-change', { detail: { name: 'name', value: 'Alice' } }));
    await element.updateComplete;
    expect((element as any).localErrors.name).toBeUndefined();

    // Field change when no error exists
    field.dispatchEvent(new CustomEvent('cw:field-change', { detail: { name: 'email', value: 'alice@example.com' } }));
    await element.updateComplete;

    // 4. Same values property set twice
    element.values = { name: 'Alice', email: 'alice@example.com' };
    await element.updateComplete;
    element.values = { name: 'Alice', email: 'alice@example.com' };
    await element.updateComplete;

    // 5. Missing subtitle & fields undefined validate
    element.schema = { id: 'nosub', title: 'No Subtitle', submitLabel: 'Go' };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.form-subtitle')).toBeNull();
    expect((element as any).validate()).toBe(true);
  });
});
