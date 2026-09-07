import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import useThemeSwitching from '@/components/kbar/use-theme-switching';
import { THEMES } from '@/components/themes/theme.config';

type ThemeAction = { id: string; name: string; perform: () => void };

let registeredActions: ThemeAction[] = [];

vi.mock('kbar', () => ({
  useRegisterActions: (actions: ThemeAction[]) => {
    registeredActions = actions;
  }
}));

const setTheme = vi.fn();
let currentTheme = 'light';
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: currentTheme, setTheme })
}));

const setActiveTheme = vi.fn();
let activeTheme = THEMES[0].value;
vi.mock('@/components/themes/active-theme', () => ({
  useThemeConfig: () => ({ activeTheme, setActiveTheme })
}));

beforeEach(() => {
  registeredActions = [];
  setTheme.mockReset();
  setActiveTheme.mockReset();
  currentTheme = 'light';
  activeTheme = THEMES[0].value;
});

const performAction = (id: string) => registeredActions.find((a) => a.id === id)?.perform();

describe('useThemeSwitching', () => {
  it('registers the four theme actions', () => {
    renderHook(() => useThemeSwitching());
    expect(registeredActions.map((a) => a.id)).toEqual([
      'cycleTheme',
      'toggleDarkLight',
      'setLightTheme',
      'setDarkTheme'
    ]);
  });

  it('toggles light to dark and dark to light', () => {
    renderHook(() => useThemeSwitching());
    performAction('toggleDarkLight');
    expect(setTheme).toHaveBeenCalledWith('dark');

    currentTheme = 'dark';
    renderHook(() => useThemeSwitching());
    performAction('toggleDarkLight');
    expect(setTheme).toHaveBeenCalledWith('light');
  });

  it('cycles to the next theme in the list', () => {
    renderHook(() => useThemeSwitching());
    performAction('cycleTheme');
    expect(setActiveTheme).toHaveBeenCalledWith(THEMES[1].value);
  });

  it('wraps around after the last theme', () => {
    activeTheme = THEMES[THEMES.length - 1].value;
    renderHook(() => useThemeSwitching());
    performAction('cycleTheme');
    expect(setActiveTheme).toHaveBeenCalledWith(THEMES[0].value);
  });

  it('sets explicit light and dark themes', () => {
    renderHook(() => useThemeSwitching());
    performAction('setLightTheme');
    expect(setTheme).toHaveBeenCalledWith('light');
    performAction('setDarkTheme');
    expect(setTheme).toHaveBeenCalledWith('dark');
  });
});
