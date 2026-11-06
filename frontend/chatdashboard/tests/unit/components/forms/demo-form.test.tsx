import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import DemoForm from '@/components/forms/demo-form';

const alertMock = vi.fn();

beforeEach(() => {
  alertMock.mockClear();
  vi.stubGlobal('alert', alertMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const submitForm = () => {
  fireEvent.submit(document.querySelector('form') as HTMLFormElement);
};

const setText = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

function previewJson() {
  return JSON.parse(document.querySelector('pre')!.textContent as string);
}

describe('DemoForm', () => {
  it('renders every section and the live preview', () => {
    render(<DemoForm />);
    expect(screen.getByText('All Form Inputs Demo')).toBeInTheDocument();
    for (const section of [
      'Text Inputs',
      'Select & Combobox',
      'Checkbox & Radio',
      'Toggle & Switch',
      'Slider',
      'Date & Time',
      'Special Inputs',
      'File Upload'
    ]) {
      expect(screen.getByText(section)).toBeInTheDocument();
    }
    expect(screen.getByText('Form Data Preview')).toBeInTheDocument();
    expect(previewJson()).toMatchObject({ name: '', rating: 5, favoriteColor: '#6366f1' });
  });

  it('shows validation errors when submitting an empty form and does not submit', async () => {
    render(<DemoForm />);
    await submitForm();
    expect(await screen.findByText('Name must be at least 2 characters')).toBeInTheDocument();
    expect(screen.getByText('Invalid email address')).toBeInTheDocument();
    expect(screen.getByText('Age is required')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('Please select a country')).toBeInTheDocument();
    expect(screen.getByText('Select at least one interest')).toBeInTheDocument();
    expect(screen.getByText('You must accept the terms')).toBeInTheDocument();
    expect(alertMock).not.toHaveBeenCalled();
  });

  it('updates the preview as the user edits and lists selected interests as badges', async () => {
    render(<DemoForm />);
    setText(/Full Name/, 'Jane');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Music' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Travel' }));
    await waitFor(() => expect(previewJson().interests).toEqual(['music', 'travel']));
    expect(previewJson().name).toBe('Jane');
    // badge list shows labels in addition to the checkbox labels
    expect(screen.getAllByText('Music').length).toBeGreaterThan(1);
  });

  it('resets the form', async () => {
    render(<DemoForm />);
    setText(/Full Name/, 'Jane');
    await waitFor(() => expect(previewJson().name).toBe('Jane'));
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    await waitFor(() => expect(previewJson().name).toBe(''));
  });

  it('flags a taken email through async validation', async () => {
    render(<DemoForm />);
    setText(/^Email/, 'ab'); // too short: async validator bails out
    setText(/^Email/, 'taken@example.com');
    expect(
      await screen.findByText('This email is already registered', {}, { timeout: 3000 })
    ).toBeInTheDocument();
  });

  it('submits a fully filled form', async () => {
    render(<DemoForm />);
    setText(/Full Name/, 'Jane Doe');
    setText(/^Email/, 'jane@example.com');
    setText(/^Password/, 'supersecret');
    setText(/^Age/, '30');
    setText(/^Phone/, '5551234567');
    setText(/^Bio/, 'A long enough biography.');

    // Select
    fireEvent.click(screen.getAllByRole('combobox')[0]);
    const canada = await screen.findByRole('option', { name: 'Canada' });
    fireEvent.pointerMove(canada);
    fireEvent.mouseMove(canada);
    fireEvent.click(canada);
    await waitFor(() => expect(previewJson().country).toBe('ca'));

    // Combobox (Popover + Command)
    fireEvent.click(screen.getByText('Search frameworks...'));
    fireEvent.click(await screen.findByText('Remix'));
    await waitFor(() => expect(previewJson().framework).toBe('remix'));

    fireEvent.click(screen.getByRole('checkbox', { name: 'Sports' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Female' }));
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByRole('button', { name: 'Bold' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Terms and Conditions/ }));

    fireEvent.change(screen.getByLabelText('Verification Code', { selector: 'input' }), {
      target: { value: '123456' }
    });
    const tagInput = screen.getByLabelText('Add a tags');
    fireEvent.change(tagInput, { target: { value: 'hello' } });
    fireEvent.keyDown(tagInput, { key: 'Enter' });
    setText(/Event Time/, '10:30');

    await waitFor(() => {
      const v = previewJson();
      expect(v.newsletter).toBe(true);
      expect(v.tags).toEqual(['hello']);
      expect(v.otp).toBe('123456');
      expect(v.formatting).toEqual(['bold']);
    });

    await submitForm();
    await waitFor(() => expect(alertMock).toHaveBeenCalledWith('Form submitted successfully!'), {
      timeout: 3000
    });
  });

  it('picks a birth date from the calendar', async () => {
    render(<DemoForm />);
    fireEvent.click(screen.getByText('Pick a date'));
    const day = (await screen.findAllByRole('gridcell'))
      .find((c) => c.textContent === '1')!
      .querySelector('button')!;
    fireEvent.click(day);
    await waitFor(() => expect(previewJson().birthDate).toBeTruthy());
  });
});
