import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast: toastMock }));

import AdvancedFormPatterns from '@/features/forms/components/advanced-form-patterns';

beforeEach(() => toastMock.success.mockClear());
afterEach(cleanup);

const submitForm = () => {
  fireEvent.submit(document.querySelector('form') as HTMLFormElement);
};
const type = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

/** The closed trigger shows the option's label, not its value. */
async function pick(trigger: HTMLElement, optionName: string) {
  fireEvent.click(trigger);
  const option = await screen.findByRole('option', { name: optionName });
  fireEvent.pointerMove(option);
  fireEvent.mouseMove(option);
  fireEvent.click(option);
  await waitFor(() => expect(trigger).toHaveTextContent(optionName));
}

describe('AdvancedFormPatterns', () => {
  it('renders sections', () => {
    render(<AdvancedFormPatterns />);
    expect(screen.getByText('Team Registration')).toBeInTheDocument();
    for (const h of ['Account', 'Team Info', 'Members', 'Preferences']) {
      expect(screen.getByRole('heading', { name: h })).toBeInTheDocument();
    }
    expect(screen.getByLabelText('Member 1 name')).toBeInTheDocument();
  });

  it('shows schema errors for every section on an empty submit', async () => {
    render(<AdvancedFormPatterns />);
    await submitForm();
    expect(await screen.findByText('Username must be at least 3 characters')).toBeInTheDocument();
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
    expect(screen.getByText('Must be at least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('Please confirm your password')).toBeInTheDocument();
    expect(screen.getByText('Team name must be at least 2 characters')).toBeInTheDocument();
    expect(screen.getByText('Member name is required')).toBeInTheDocument();
    expect(screen.getByText('Role is required')).toBeInTheDocument();
    expect(screen.getAllByText('Select a country')).toHaveLength(2); // placeholder + error
    expect(screen.getByText('Select a state')).toBeInTheDocument();
    expect(toastMock.success).not.toHaveBeenCalled();
  });

  it('validates confirm password against password (linked field)', async () => {
    render(<AdvancedFormPatterns />);
    type(/^Password/, 'secret123');
    type(/^Confirm Password/, 'different');
    fireEvent.blur(screen.getByLabelText(/^Confirm Password/));
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    // changing the password re-validates the linked field; fixing confirm clears it
    type(/^Confirm Password/, 'secret123');
    await waitFor(() =>
      expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument()
    );
  });

  it('rejects taken usernames through async validation', async () => {
    render(<AdvancedFormPatterns />);
    type(/^Username/, 'ab'); // too short, async check skipped
    type(/^Username/, 'admin');
    fireEvent.blur(screen.getByLabelText(/^Username/));
    expect(await screen.findByText('Username is taken', {}, { timeout: 4000 })).toBeInTheDocument();
  });

  it('adds, labels and removes member rows', async () => {
    render(<AdvancedFormPatterns />);
    type('Member 1 name', 'Ann');
    type('Member 1 role', 'Lead');

    // NOTE: the badge preview only re-renders when the array itself changes
    // (add/remove), not on keystrokes inside a row.
    fireEvent.click(screen.getByRole('button', { name: /add member/i }));
    expect(screen.getByLabelText('Member 2 name')).toBeInTheDocument();
    expect(await screen.findByText('Ann (Lead)')).toBeInTheDocument();

    type('Member 2 name', 'Bob');
    fireEvent.click(screen.getByRole('button', { name: /add member/i }));
    expect(await screen.findByText('Bob')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove member 1' }));
    await waitFor(() => expect(screen.queryByText('Ann (Lead)')).not.toBeInTheDocument());
    expect(screen.getByLabelText('Member 1 name')).toHaveValue('Bob');
  });

  it('shows dependent states and resets the state when country changes', async () => {
    render(<AdvancedFormPatterns />);
    expect(screen.getByText('Select a country first')).toBeInTheDocument();
    const [country, state] = screen.getAllByRole('combobox');
    await pick(country, 'United States');
    expect(screen.getByText('Select state')).toBeInTheDocument();
    await pick(state, 'Texas');

    await pick(country, 'Australia');
    await waitFor(() =>
      expect(screen.getAllByRole('combobox')[1]).toHaveTextContent('Select state')
    );
  });

  it('submits a valid registration and can be reset', async () => {
    render(<AdvancedFormPatterns />);
    type(/^Username/, 'newuser');
    type(/^Email/, 'a@b.co');
    type(/^Password/, 'password1');
    type(/^Confirm Password/, 'password1');
    type(/^Team Name/, 'Alpha');
    type(/^Team Size/, '5');
    type('Member 1 name', 'Ann');
    type('Member 1 role', 'Lead');
    const [country, state] = screen.getAllByRole('combobox');
    await pick(country, 'United Kingdom');
    await pick(state, 'London');

    // let the username's async check (500ms debounce + 500ms lookup) settle first;
    // a submit fired while it is pending does not go through.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1500));
    });
    await submitForm();
    await waitFor(
      () => expect(toastMock.success).toHaveBeenCalledWith('Team registered successfully!'),
      { timeout: 3000 }
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    await waitFor(() => expect(screen.getByLabelText(/^Team Name/)).toHaveValue(''));
  });
});
