import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../../../components/molecules/cw-form-field.js';
import { CwFormField } from '../../../components/molecules/cw-form-field.js';

describe('CwFormField Molecule Component', () => {
  let element: CwFormField;

  beforeEach(async () => {
    document.body.innerHTML = '';
    element = new CwFormField();
    document.body.appendChild(element);
    await element.updateComplete;
  });

  it('should instantiate and mount cw-form-field element', () => {
    expect(element).toBeDefined();
    expect(element.tagName.toLowerCase()).toBe('cw-form-field');
  });

  it('should render input field, label, required asterisk, and handle input', async () => {
    element.field = { name: 'email', label: 'Email', type: 'text', required: true };
    element.value = 'test@example.com';
    await element.updateComplete;

    const label = element.shadowRoot?.querySelector('label');
    expect(label?.textContent).toContain('Email');
    expect(element.shadowRoot?.querySelector('.req-asterisk')).not.toBeNull();

    const spy = vi.fn();
    element.addEventListener('cw:field-change', spy);

    const input = element.shadowRoot?.querySelector('input') as HTMLInputElement;
    input.value = 'new@example.com';
    input.dispatchEvent(new Event('input'));

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ detail: { name: 'email', value: 'new@example.com' } })
    );
  });

  it('should render textarea without label or placeholder', async () => {
    element.field = { name: 'notes', label: '', type: 'textarea' };
    await element.updateComplete;

    const label = element.shadowRoot?.querySelector('label');
    expect(label).toBeNull();

    const textarea = element.shadowRoot?.querySelector('textarea');
    expect(textarea).not.toBeNull();
  });

  it('should render textarea and select dropdown fields', async () => {
    element.field = { name: 'message', label: 'Message', type: 'textarea', placeholder: 'Write...' };
    await element.updateComplete;

    const textarea = element.shadowRoot?.querySelector('textarea');
    expect(textarea).not.toBeNull();

    element.field = {
      name: 'category',
      label: 'Category',
      type: 'select',
      placeholder: 'Select...',
      options: [
        { label: 'Sales', value: 'sales' },
        { label: 'Support', value: 'support' },
      ],
    };
    element.value = '';
    await element.updateComplete;

    const select = element.shadowRoot?.querySelector('select') as HTMLSelectElement;
    expect(select).not.toBeNull();

    const spy = vi.fn();
    element.addEventListener('cw:field-change', spy);
    select.dispatchEvent(new Event('change'));
    expect(spy).toHaveBeenCalled();
  });

  it('should render error message when error property is set', async () => {
    element.field = { name: 'name', label: 'Name', type: 'text' };
    element.error = 'Name is required';
    await element.updateComplete;

    const error = element.shadowRoot?.querySelector('.error-msg');
    expect(error).not.toBeNull();
    expect(error?.textContent).toContain('Name is required');
  });

  it('handles empty field, selected select option, missing options, default input type fallback, and disabled state', async () => {
    // 1. empty field
    element.field = undefined as any;
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.field-container')).toBeNull();

    // 2. select option with value set & no placeholder & options undefined
    element.field = { name: 'dept', label: 'Department', type: 'select' };
    element.value = 'sales';
    element.disabled = true;
    await element.updateComplete;

    let select = element.shadowRoot?.querySelector('select') as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(select.hasAttribute('disabled')).toBe(true);

    // select with placeholder and value set
    element.field = {
      name: 'dept',
      label: 'Department',
      type: 'select',
      placeholder: 'Choose dept',
      options: [{ label: 'Sales', value: 'sales' }, { label: 'Tech', value: 'tech' }],
    };
    await element.updateComplete;
    select = element.shadowRoot?.querySelector('select') as HTMLSelectElement;
    expect(select).not.toBeNull();

    // 3. input with type undefined
    element.field = { name: 'custom', label: 'Custom' } as any;
    await element.updateComplete;
    const input = element.shadowRoot?.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('type')).toBe('text');
  });
});

describe('CwFormField controls', () => {
  const mount = async (props: Partial<CwFormField>) => {
    document.body.innerHTML = '';
    const el = new CwFormField();
    Object.assign(el, props);
    document.body.appendChild(el);
    await el.updateComplete;
    return el;
  };

  it('renders a textarea with its row count and placeholder', async () => {
    const el = await mount({ field: { name: 'msg', label: 'Message', type: 'textarea', rows: 5, placeholder: 'Say it' } as never, value: 'hi' });
    const ta = el.shadowRoot!.querySelector('textarea') as HTMLTextAreaElement;
    expect(ta.getAttribute('rows')).toBe('5');
    expect(ta.getAttribute('placeholder')).toBe('Say it');
    expect(ta.value).toBe('hi');
    expect(el.shadowRoot!.querySelector('input,select')).toBeNull();
  });

  it('defaults a textarea to three rows', async () => {
    const el = await mount({ field: { name: 'msg', label: 'Message', type: 'textarea' } as never });
    expect(el.shadowRoot!.querySelector('textarea')!.getAttribute('rows')).toBe('3');
  });

  it('renders a select with a disabled placeholder option and marks the chosen one', async () => {
    const el = await mount({
      field: { name: 'topic', label: 'Topic', type: 'select', placeholder: 'Pick one', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] } as never,
      value: 'b'
    });
    const options = Array.from(el.shadowRoot!.querySelectorAll('option'));
    expect(options.map((o) => o.textContent!.trim())).toEqual(['Pick one', 'A', 'B']);
    expect(options[0].hasAttribute('disabled')).toBe(true);
    expect(options[0].hasAttribute('selected')).toBe(false);
    expect(options[2].hasAttribute('selected')).toBe(true);
  });

  it('selects the placeholder when nothing is chosen, and copes with missing options', async () => {
    const el = await mount({ field: { name: 'topic', label: 'Topic', type: 'select', placeholder: 'Pick one' } as never, value: '' });
    const options = Array.from(el.shadowRoot!.querySelectorAll('option'));
    expect(options).toHaveLength(1);
    expect(options[0].hasAttribute('selected')).toBe(true);
  });

  it('renders a plain input, defaulting its type to text', async () => {
    const el = await mount({ field: { name: 'who', label: 'Name' } as never, disabled: true });
    const input = el.shadowRoot!.querySelector('input') as HTMLInputElement;
    expect(input.type).toBe('text');
    expect(input.disabled).toBe(true);
    const email = await mount({ field: { name: 'mail', label: 'Email', type: 'email' } as never });
    expect(email.shadowRoot!.querySelector('input')!.type).toBe('email');
  });
});
