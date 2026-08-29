import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../../../components/molecules/cw-greet-input.js';
import { CwGreetInput } from '../../../components/molecules/cw-greet-input.js';

describe('CwGreetInput Molecule Component', () => {
  let element: CwGreetInput;

  beforeEach(async () => {
    document.body.innerHTML = '';
    element = new CwGreetInput();
    document.body.appendChild(element);
    await element.updateComplete;
  });

  it('should instantiate and mount cw-greet-input element', () => {
    expect(element).toBeDefined();
    expect(element.tagName.toLowerCase()).toBe('cw-greet-input');
  });

  it('should render input field when visible is true', async () => {
    element.visible = true;
    element.config = { enabled: true, placeholder: 'Type a message...' };
    await element.updateComplete;

    const input = element.shadowRoot?.querySelector('input');
    expect(input).not.toBeNull();
    expect(input?.placeholder).toBe('Type a message...');
  });

  it('should dispatch cw:greet-input on input and cw:greet-submit on enter key', async () => {
    element.visible = true;
    element.config = { enabled: true, placeholder: 'Type a message...', animationOpeningSec: 0.5 };
    const inputSpy = vi.fn();
    const submitSpy = vi.fn();
    element.addEventListener('cw:greet-input', inputSpy);
    element.addEventListener('cw:greet-submit', submitSpy);
    await element.updateComplete;

    const input = element.shadowRoot?.querySelector('input') as HTMLInputElement;
    if (input) {
      input.value = 'Hello!';
      input.dispatchEvent(new Event('input'));
      expect(inputSpy).toHaveBeenCalledWith(expect.objectContaining({ detail: 'Hello!' }));

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(submitSpy).toHaveBeenCalledWith(expect.objectContaining({ detail: 'Hello!' }));
    }
  });

  it('renders separated layout and handles button click', async () => {
    element.visible = true;
    element.config = {
      enabled: true,
      layout: 'separated',
      buttonBgColor: '#00ff00',
      buttonIconColor: '#00ff00',
      borderRadius: 16,
    };
    const submitSpy = vi.fn();
    element.addEventListener('cw:greet-submit', submitSpy);
    await element.updateComplete;

    const btn = element.shadowRoot?.querySelector('cw-button');
    expect(btn).not.toBeNull();
    btn?.click();
    expect(submitSpy).toHaveBeenCalled();
  });

  it('renders joined layout with matching button color and icon color', async () => {
    element.visible = true;
    element.config = {
      enabled: true,
      layout: 'joined',
      buttonColor: '#ff0000',
      buttonIconColor: '#FF0000',
    };
    await element.updateComplete;

    const btn = element.shadowRoot?.querySelector('cw-button');
    expect(btn).not.toBeNull();
  });

  it('handles differing buttonIconColor in separated and joined layouts, string borderRadius, and non-Enter keydown', async () => {
    element.visible = true;
    element.config = {
      enabled: true,
      layout: 'separated',
      buttonBgColor: '#ffffff',
      buttonIconColor: '#000000',
      borderRadius: '18px',
    };
    await element.updateComplete;

    let btn = element.shadowRoot?.querySelector('cw-button');
    expect(btn).not.toBeNull();

    // Joined layout with differing buttonIconColor and buttonColor
    element.config = {
      enabled: true,
      layout: 'joined',
      buttonColor: '#0000ff',
      buttonIconColor: '#ffffff',
      borderRadius: undefined,
    };
    await element.updateComplete;

    btn = element.shadowRoot?.querySelector('cw-button');
    expect(btn).not.toBeNull();

    // Non-Enter keydown
    const input = element.shadowRoot?.querySelector('input') as HTMLInputElement;
    const spy = vi.fn();
    element.addEventListener('cw:greet-submit', spy);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(spy).not.toHaveBeenCalled();

    // Default button color fallbacks (omitting buttonBgColor, buttonColor, accentColor)
    element.accentColor = '';
    element.config = { enabled: true, layout: 'separated' };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('cw-button')).not.toBeNull();

    element.config = { enabled: true, layout: 'joined' };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('cw-button')).not.toBeNull();
  });

  it('triggers transition enterMs and leaveMs callbacks on visibility toggles', async () => {
    expect((element as any).transition.enterMs()).toBeGreaterThan(0);
    expect((element as any).transition.leaveMs()).toBe(0);

    vi.useFakeTimers();
    element.config = { enabled: true, animationOpeningSec: 0.4 };
    element.visible = false;
    await element.updateComplete;

    expect((element as any).transition.enterMs()).toBe(400);

    element.visible = true;
    await element.updateComplete;
    vi.advanceTimersByTime(500);

    element.visible = false;
    await element.updateComplete;
    vi.advanceTimersByTime(100);

    element.config = { enabled: true }; // without animationOpeningSec
    element.visible = true;
    await element.updateComplete;
    vi.advanceTimersByTime(500);

    vi.useRealTimers();
  });
});
