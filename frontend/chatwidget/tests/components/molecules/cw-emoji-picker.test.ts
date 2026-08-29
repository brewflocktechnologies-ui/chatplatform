import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../../../components/molecules/cw-emoji-picker.js';
import { CwEmojiPicker } from '../../../components/molecules/cw-emoji-picker.js';

describe('CwEmojiPicker Molecule Component', () => {
  let element: CwEmojiPicker;

  beforeEach(async () => {
    document.body.innerHTML = '';
    element = new CwEmojiPicker();
    document.body.appendChild(element);
    await element.updateComplete;
  });

  it('should instantiate and mount cw-emoji-picker element', () => {
    expect(element).toBeDefined();
    expect(element.tagName.toLowerCase()).toBe('cw-emoji-picker');
  });

  it('should render default emoji buttons', () => {
    const btns = element.shadowRoot?.querySelectorAll('.emoji-btn');
    expect(btns).not.toBeNull();
    expect(btns?.length).toBeGreaterThan(5);
  });

  it('should dispatch cw:insert-emoji with selected emoji on click', () => {
    const spy = vi.fn();
    element.addEventListener('cw:insert-emoji', spy);

    const firstBtn = element.shadowRoot?.querySelector('.emoji-btn') as HTMLElement;
    firstBtn?.click();

    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0].detail).toBeDefined();
  });

  it('parses emoji inputs in different formats (comma, space, grapheme, array)', async () => {
    element.emojis = '😀, 😂, 😊';
    await element.updateComplete;
    let btns = element.shadowRoot?.querySelectorAll('.emoji-btn');
    expect(btns?.length).toBe(3);

    element.emojis = '👍 👎 🙏';
    await element.updateComplete;
    btns = element.shadowRoot?.querySelectorAll('.emoji-btn');
    expect(btns?.length).toBe(3);

    element.emojis = '🎉❤️';
    await element.updateComplete;
    btns = element.shadowRoot?.querySelectorAll('.emoji-btn');
    expect(btns?.length).toBe(2);

    element.emojis = ['🔥', '✨'];
    await element.updateComplete;
    btns = element.shadowRoot?.querySelectorAll('.emoji-btn');
    expect(btns?.length).toBe(2);

    element.emojis = '' as any;
    await element.updateComplete;
    btns = element.shadowRoot?.querySelectorAll('.emoji-btn');
    expect(btns?.length).toBeGreaterThan(5);

    element.emojis = '   ';
    await element.updateComplete;
    btns = element.shadowRoot?.querySelectorAll('.emoji-btn');
    expect(btns?.length).toBeGreaterThan(5);
  });

  it('handles Intl.Segmenter exception fallback and empty segmenter fallback', async () => {
    const origSegmenter = Intl.Segmenter;
    (Intl as any).Segmenter = function () {
      throw new Error('Not supported');
    };

    element.emojis = 'ABC';
    await element.updateComplete;

    let btns = element.shadowRoot?.querySelectorAll('.emoji-btn');
    expect(btns?.length).toBe(3);

    (Intl as any).Segmenter = origSegmenter;

    // Mock Segmenter returning empty segments to hit line 33 fallback
    (Intl as any).Segmenter = function () {
      return { segment: () => [] };
    };

    element.emojis = 'XYZ';
    await element.updateComplete;
    btns = element.shadowRoot?.querySelectorAll('.emoji-btn');
    expect(btns?.length).toBeGreaterThan(5);

    (Intl as any).Segmenter = origSegmenter;
  });
});
