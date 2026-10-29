import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast: toastMock }));

// Skip the spring/exit animation so step transitions are synchronous in jsdom.
vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, className }: any) => <div className={className}>{children}</div>
  }
}));

import MultiStepProductForm from '@/features/forms/components/multi-step-product-form';
import FormsShowcasePage from '@/features/forms/components/forms-showcase-page';

beforeEach(() => toastMock.success.mockClear());
afterEach(cleanup);

const next = () => {
  fireEvent.click(screen.getByRole('button', { name: /next/i }));
};

async function fillStep1() {
  fireEvent.change(screen.getByLabelText(/Product Name/), { target: { value: 'Widget' } });
  fireEvent.change(screen.getByLabelText(/^Price/), { target: { value: '9.5' } });
  const trigger = screen.getByRole('combobox');
  fireEvent.click(trigger);
  const option = await screen.findByRole('option', { name: 'Electronics' });
  fireEvent.pointerMove(option);
  fireEvent.mouseMove(option);
  fireEvent.click(option);
  await waitFor(() => expect(trigger).toHaveTextContent('Electronics'));
}

describe('MultiStepProductForm', () => {
  it('starts on step 1 with Previous disabled', () => {
    render(<MultiStepProductForm />);
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('Basic Info')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
  });

  it('blocks Next on invalid step 1 and paints the errors', async () => {
    render(<MultiStepProductForm />);
    await next();
    expect(
      await screen.findByText('Product name must be at least 2 characters')
    ).toBeInTheDocument();
    expect(screen.getByText('Please select a category')).toBeInTheDocument();
    expect(screen.getByText('Price is required')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  });

  it('walks through all steps, goes back, and submits from the review step', async () => {
    render(<MultiStepProductForm />);
    await fillStep1();
    expect(await screen.findByRole('button', { name: 'Reset' })).toBeInTheDocument();
    await next();
    expect(await screen.findByText('Step 2 of 3')).toBeInTheDocument();

    // invalid description blocks
    await next();
    expect(
      await screen.findByText('Description must be at least 10 characters')
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: 'A thoroughly decent widget.' }
    });
    await next();
    expect(await screen.findByText('Step 3 of 3')).toBeInTheDocument();
    expect(screen.getByText('Review & Submit')).toBeInTheDocument();
    expect(screen.getByText('Widget')).toBeInTheDocument();
    expect(screen.getByText('$9.5')).toBeInTheDocument();
    expect(screen.getByText('A thoroughly decent widget.')).toBeInTheDocument();

    // back to step 2 and forward again
    fireEvent.click(screen.getByRole('button', { name: /previous/i }));
    expect(await screen.findByText('Step 2 of 3')).toBeInTheDocument();
    await next();
    expect(await screen.findByText('Step 3 of 3')).toBeInTheDocument();

    fireEvent.submit(document.querySelector('form') as HTMLFormElement);
    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith('Product created successfully!')
    );
  });

  it('resets the form from step 1', async () => {
    render(<MultiStepProductForm />);
    fireEvent.change(screen.getByLabelText(/Product Name/), { target: { value: 'Widget' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Reset' }));
    await waitFor(() => expect(screen.getByLabelText(/Product Name/)).toHaveValue(''));
  });

  it('submitting with Enter on a middle step goes through the step gate', async () => {
    render(<MultiStepProductForm />);
    await fillStep1();
    fireEvent.submit(document.querySelector('form') as HTMLFormElement);
    expect(await screen.findByText('Step 2 of 3')).toBeInTheDocument();
    expect(toastMock.success).not.toHaveBeenCalled();
  });

  it('shows placeholders on the review step after the form is reset', async () => {
    render(<MultiStepProductForm />);
    await fillStep1();
    await next();
    fireEvent.change(await screen.findByLabelText(/Description/), {
      target: { value: 'A thoroughly decent widget.' }
    });
    await next();
    expect(await screen.findByText('Step 3 of 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    await waitFor(() => expect(screen.getAllByText('—')).toHaveLength(4));
  });
});

describe('FormsShowcasePage', () => {
  it('renders the multi-step form', () => {
    render(<FormsShowcasePage />);
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  });
});
