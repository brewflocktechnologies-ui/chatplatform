import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ThemeModeToggle } from '@/components/themes/theme-mode-toggle';

let resolvedTheme = 'light';
const setTheme = vi.fn((t: string) => {
  resolvedTheme = t;
});

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme, setTheme })
}));

describe('ThemeModeToggle', () => {
  beforeEach(() => {
    resolvedTheme = 'light';
    setTheme.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the toggle button', () => {
    render(<ThemeModeToggle />);
    expect(screen.getByRole('button', { name: 'Toggle theme' })).toBeInTheDocument();
  });

  it('switches to dark when currently light', () => {
    render(<ThemeModeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Toggle theme' }));
    expect(setTheme).toHaveBeenCalledWith('dark');
  });

  it('switches to light when currently dark', () => {
    resolvedTheme = 'dark';
    render(<ThemeModeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Toggle theme' }));
    expect(setTheme).toHaveBeenCalledWith('light');
  });

  it('toggles the theme via Ctrl+Shift+D', () => {
    render(<ThemeModeToggle />);
    fireEvent.keyDown(window, { key: 'd', shiftKey: true, ctrlKey: true });
    expect(setTheme).toHaveBeenCalledWith('dark');
  });

  it('toggles the theme via Cmd+Shift+D', () => {
    resolvedTheme = 'dark';
    render(<ThemeModeToggle />);
    fireEvent.keyDown(window, { key: 'd', shiftKey: true, metaKey: true });
    expect(setTheme).toHaveBeenCalledWith('light');
  });

  it('ignores the shortcut when focused in an input', () => {
    render(<ThemeModeToggle />);
    const input = document.createElement('input');
    input.focus();
    fireEvent.keyDown(input, { key: 'd', shiftKey: true, ctrlKey: true });
    expect(setTheme).not.toHaveBeenCalled();
  });
});