import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const setTheme = vi.fn();
const setActiveTheme = vi.fn();

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light', setTheme })
}));
vi.mock('@/components/themes/active-theme', () => ({
  useThemeConfig: () => ({ activeTheme: 'vercel', setActiveTheme })
}));
// Drive onValueChange directly, including the null that Base UI can emit.
vi.mock('@/components/ui/select', () => ({
  Select: ({ onValueChange, children }: any) => (
    <div>
      <button onClick={() => onValueChange(null)}>emit-null</button>
      <button onClick={() => onValueChange('zen')}>emit-zen</button>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => null,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectGroup: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
  SelectLabel: ({ children }: any) => <div>{children}</div>,
  SelectSeparator: () => null
}));

import { ThemeSelector } from '@/components/themes/theme-selector';
import { ThemeModeToggle } from '@/components/themes/theme-mode-toggle';

afterEach(() => {
  cleanup();
  setTheme.mockClear();
  setActiveTheme.mockClear();
});

describe('ThemeSelector value handling', () => {
  it('ignores a null selection', () => {
    render(<ThemeSelector />);
    fireEvent.click(screen.getByText('emit-null'));
    expect(setActiveTheme).not.toHaveBeenCalled();
  });

  it('applies a real selection', () => {
    render(<ThemeSelector />);
    fireEvent.click(screen.getByText('emit-zen'));
    expect(setActiveTheme).toHaveBeenCalledWith('zen');
  });
});

describe('ThemeModeToggle keyboard shortcut guards', () => {
  it.each([
    ['input', () => document.createElement('input')],
    ['textarea', () => document.createElement('textarea')],
    ['select', () => document.createElement('select')]
  ])('does not toggle while typing in a %s', (_name, make) => {
    render(<ThemeModeToggle />);
    const el = make();
    document.body.appendChild(el);
    fireEvent.keyDown(el, { key: 'D', shiftKey: true, ctrlKey: true });
    expect(setTheme).not.toHaveBeenCalled();
    el.remove();
  });

  it('does not toggle inside contenteditable regions', () => {
    render(<ThemeModeToggle />);
    const el = document.createElement('div');
    // jsdom does not implement isContentEditable; define it like a browser would.
    Object.defineProperty(el, 'isContentEditable', { value: true });
    document.body.appendChild(el);
    fireEvent.keyDown(el, { key: 'D', shiftKey: true, ctrlKey: true });
    expect(setTheme).not.toHaveBeenCalled();
    el.remove();
  });

  it('requires Shift and a modifier', () => {
    render(<ThemeModeToggle />);
    fireEvent.keyDown(window, { key: 'd', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'd', shiftKey: true });
    expect(setTheme).not.toHaveBeenCalled();
  });
});
