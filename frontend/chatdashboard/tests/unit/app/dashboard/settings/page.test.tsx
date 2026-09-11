import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import SettingsPage from '@/app/dashboard/settings/page';
import { ActiveThemeProvider } from '@/components/themes/active-theme';

function renderPage() {
  return render(
    <ActiveThemeProvider>
      <SettingsPage />
    </ActiveThemeProvider>
  );
}

describe('SettingsPage', () => {
  afterEach(() => {
    cleanup();
    document.documentElement.removeAttribute('data-theme');
  });

  it('renders the Settings page with an Appearance card', () => {
    renderPage();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(
      screen.getByText('Pick the theme used across the dashboard.')
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Theme' })).toBeInTheDocument();
  });

  it('updates the active theme when a new theme is selected', () => {
    renderPage();
    const trigger = screen.getByRole('combobox', { name: 'Theme' });
    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);

    const option = screen.getByRole('option', { name: 'Supabase' });
    fireEvent.pointerDown(option);
    fireEvent.click(option);

    expect(trigger).toHaveTextContent('Supabase');
  });
});