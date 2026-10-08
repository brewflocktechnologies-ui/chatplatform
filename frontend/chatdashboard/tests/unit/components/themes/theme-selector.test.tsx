import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ThemeSelector } from '@/components/themes/theme-selector';

let activeTheme = 'vercel';
const setActiveTheme = vi.fn((t: string) => {
  activeTheme = t;
});

vi.mock('@/components/themes/active-theme', () => ({
  useThemeConfig: () => ({ activeTheme, setActiveTheme })
}));

function open() {
  const trigger = screen.getByRole('combobox', { name: 'Theme' });
  fireEvent.pointerDown(trigger);
  fireEvent.click(trigger);
}

describe('ThemeSelector', () => {
  beforeEach(() => {
    activeTheme = 'vercel';
    setActiveTheme.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the trigger labelled Theme with the active theme label', () => {
    render(<ThemeSelector />);
    const trigger = screen.getByRole('combobox', { name: 'Theme' });
    expect(trigger).toBeInTheDocument();
    expect(screen.getByText('Vercel')).toBeInTheDocument();
    expect(screen.getByText('T T')).toBeInTheDocument();
  });

  it('shows the list of themes when opened', () => {
    render(<ThemeSelector />);
    open();

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    const options = screen.getAllByRole('option');
    expect(options.map((option) => option.textContent?.trim())).toEqual([
      'Claude',
      'Discord',
      'Supabase',
      'Vercel',
      'Mono',
      'Notebook',
      'Light Green',
      'Zen',
      'Astro Vista',
      'WhatsApp'
    ]);
  });

  it('selects a new theme', () => {
    render(<ThemeSelector />);
    open();
    const option = screen.getByRole('option', { name: 'Claude' });
    fireEvent.pointerDown(option);
    fireEvent.click(option);

    expect(setActiveTheme).toHaveBeenCalledWith('claude');
  });
});