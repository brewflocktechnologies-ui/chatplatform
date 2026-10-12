import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ActiveThemeProvider, useThemeConfig } from '@/components/themes/active-theme';
import ThemeProvider from '@/components/themes/theme-provider';
import { DEFAULT_THEME, THEMES } from '@/components/themes/theme.config';

function Probe() {
  const { activeTheme, setActiveTheme } = useThemeConfig();
  return (
    <div>
      <span data-testid='theme'>{activeTheme}</span>
      <button onClick={() => setActiveTheme('zen')}>zen</button>
    </div>
  );
}

function clearCookies() {
  document.cookie = 'active_theme=; path=/; max-age=0';
}

beforeEach(() => {
  document.documentElement.removeAttribute('data-theme');
  document.body.className = '';
  clearCookies();
});
afterEach(() => {
  cleanup();
  clearCookies();
});

describe('ActiveThemeProvider', () => {
  it('falls back to the default theme and applies it to <html> and the cookie', () => {
    render(
      <ActiveThemeProvider>
        <Probe />
      </ActiveThemeProvider>
    );
    expect(screen.getByTestId('theme')).toHaveTextContent(DEFAULT_THEME);
    expect(document.documentElement.getAttribute('data-theme')).toBe(DEFAULT_THEME);
    expect(document.cookie).toContain(`active_theme=${DEFAULT_THEME}`);
  });

  it('uses the initial theme and removes stale theme-* body classes', () => {
    document.body.classList.add('theme-old', 'keep-me');
    render(
      <ActiveThemeProvider initialTheme='claude'>
        <Probe />
      </ActiveThemeProvider>
    );
    expect(document.documentElement.getAttribute('data-theme')).toBe('claude');
    expect(document.body.classList.contains('theme-old')).toBe(false);
    expect(document.body.classList.contains('keep-me')).toBe(true);
  });

  it('updates the attribute and cookie when the theme changes', () => {
    render(
      <ActiveThemeProvider initialTheme='claude'>
        <Probe />
      </ActiveThemeProvider>
    );
    fireEvent.click(screen.getByText('zen'));
    expect(screen.getByTestId('theme')).toHaveTextContent('zen');
    expect(document.documentElement.getAttribute('data-theme')).toBe('zen');
    expect(document.cookie).toContain('active_theme=zen');
  });

  it('re-writes a missing cookie when <html> already has the theme', () => {
    document.documentElement.setAttribute('data-theme', 'mono');
    render(
      <ActiveThemeProvider initialTheme='mono'>
        <Probe />
      </ActiveThemeProvider>
    );
    expect(document.documentElement.getAttribute('data-theme')).toBe('mono');
    expect(document.cookie).toContain('active_theme=mono');
  });

  it('does not set a data-theme attribute for an empty active theme', () => {
    function Clearer() {
      const { setActiveTheme } = useThemeConfig();
      return <button onClick={() => setActiveTheme('')}>clear</button>;
    }
    render(
      <ActiveThemeProvider initialTheme='claude'>
        <Clearer />
      </ActiveThemeProvider>
    );
    act(() => {
      fireEvent.click(screen.getByText('clear'));
    });
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('marks the cookie Secure on https pages', () => {
    const original = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...original, protocol: 'https:' }
    });
    const cookieSetter: string[] = [];
    const descriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')!;
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => descriptor.get!.call(document),
      set: (v: string) => {
        cookieSetter.push(v);
      }
    });
    try {
      render(
        <ActiveThemeProvider initialTheme='claude'>
          <Probe />
        </ActiveThemeProvider>
      );
      expect(cookieSetter.some((c) => c.includes('Secure;'))).toBe(true);
    } finally {
      delete (document as unknown as Record<string, unknown>).cookie;
      Object.defineProperty(window, 'location', { configurable: true, value: original });
    }
  });
});

describe('useThemeConfig', () => {
  it('throws outside the provider', () => {
    const spy = () => {};
    const original = console.error;
    console.error = spy;
    try {
      expect(() => render(<Probe />)).toThrow(
        'useThemeConfig must be used within an ActiveThemeProvider'
      );
    } finally {
      console.error = original;
    }
  });
});

describe('ThemeProvider', () => {
  it('renders children through next-themes', () => {
    render(
      <ThemeProvider attribute='class' defaultTheme='light'>
        <span>child</span>
      </ThemeProvider>
    );
    expect(screen.getByText('child')).toBeInTheDocument();
  });
});

describe('theme.config', () => {
  it('lists the default theme among the selectable themes', () => {
    expect(THEMES.map((t) => t.value)).toContain(DEFAULT_THEME);
    expect(new Set(THEMES.map((t) => t.value)).size).toBe(THEMES.length);
  });
});
