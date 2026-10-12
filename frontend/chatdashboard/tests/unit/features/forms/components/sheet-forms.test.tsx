import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const toastMock = vi.hoisted(() => {
  const t: any = vi.fn();
  t.success = vi.fn();
  t.error = vi.fn();
  t.warning = vi.fn();
  t.info = vi.fn();
  t.promise = vi.fn();
  return t;
});
vi.mock('sonner', () => ({ toast: toastMock }));

import SheetFormDemo from '@/features/forms/components/sheet-form-demo';
import SheetProductForm from '@/features/forms/components/sheet-product-form';

const alertMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('alert', alertMock);
  alertMock.mockClear();
  for (const k of ['success', 'error', 'warning', 'info', 'promise']) toastMock[k].mockClear();
  toastMock.mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function pickCategory() {
  const trigger = screen.getByRole('combobox');
  fireEvent.click(trigger);
  const option = await screen.findByRole('option', { name: 'Electronics' });
  fireEvent.pointerMove(option);
  fireEvent.mouseMove(option);
  fireEvent.click(option);
  await waitFor(() => expect(trigger).toHaveTextContent('electronics'));
}

describe('SheetProductForm', () => {
  it('opens the sheet, validates, submits and closes', async () => {
    render(<SheetProductForm />);
    fireEvent.click(screen.getByRole('button', { name: /add product/i }));
    expect(await screen.findByText('New Product')).toBeInTheDocument();

    await act(async () => {
      fireEvent.submit(document.querySelector('#sheet-product-form') as HTMLFormElement);
    });
    expect(
      await screen.findByText('Product name must be at least 2 characters')
    ).toBeInTheDocument();
    expect(screen.getByText('Price is required')).toBeInTheDocument();
    expect(screen.getByText('Please select a category')).toBeInTheDocument();
    expect(screen.getByText('Description must be at least 10 characters')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Product Name/), { target: { value: 'Lamp' } });
    fireEvent.change(screen.getByLabelText(/^Price/), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: 'A very nice lamp.' }
    });
    await pickCategory();
    await act(async () => {
      fireEvent.submit(document.querySelector('#sheet-product-form') as HTMLFormElement);
    });
    await waitFor(() => expect(alertMock).toHaveBeenCalledWith('Product created successfully!'));
    await waitFor(() => expect(screen.queryByText('New Product')).not.toBeInTheDocument());
  });

  it('closes via Cancel', async () => {
    render(<SheetProductForm />);
    fireEvent.click(screen.getByRole('button', { name: /add product/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText('New Product')).not.toBeInTheDocument());
  });
});

describe('SheetFormDemo', () => {
  it('renders the three demo sections', () => {
    render(<SheetFormDemo />);
    expect(screen.getByText('Sheet Form')).toBeInTheDocument();
    expect(screen.getByText('Dialog Form')).toBeInTheDocument();
    expect(screen.getByText('Toast Notifications')).toBeInTheDocument();
  });

  it('submits the sheet form and shows a toast with the product name', async () => {
    render(<SheetFormDemo />);
    fireEvent.click(screen.getByRole('button', { name: /add product/i }));
    expect(await screen.findByText('New Product')).toBeInTheDocument();

    await act(async () => {
      fireEvent.submit(document.querySelector('#sheet-form-id') as HTMLFormElement);
    });
    expect(
      await screen.findByText('Product name must be at least 2 characters')
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Product Name/), { target: { value: 'Lamp' } });
    fireEvent.change(screen.getByLabelText(/^Price/), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: 'A very nice lamp.' }
    });
    await pickCategory();
    await act(async () => {
      fireEvent.submit(document.querySelector('#sheet-form-id') as HTMLFormElement);
    });
    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith('Product created successfully!', {
        description: 'Lamp has been added.'
      })
    );
  });

  it('closes the sheet via Cancel', async () => {
    render(<SheetFormDemo />);
    fireEvent.click(screen.getByRole('button', { name: /add product/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText('New Product')).not.toBeInTheDocument());
  });

  it('submits the dialog form', async () => {
    render(<SheetFormDemo />);
    fireEvent.click(screen.getByRole('button', { name: /send feedback/i }));
    expect(await screen.findByText('Quick Feedback')).toBeInTheDocument();

    await act(async () => {
      fireEvent.submit(document.querySelector('#dialog-form-id') as HTMLFormElement);
    });
    expect(await screen.findByText('Feedback must be at least 5 characters')).toBeInTheDocument();
    expect(toastMock.success).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText('Tell us what you think...'), {
      target: { value: 'Great stuff' }
    });
    await act(async () => {
      fireEvent.submit(document.querySelector('#dialog-form-id') as HTMLFormElement);
    });
    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith('Feedback submitted!', {
        description: 'Rating: 5/10. Thank you!'
      })
    );
    await waitFor(() => expect(screen.queryByText('Quick Feedback')).not.toBeInTheDocument());
  });

  it('closes the dialog via Cancel', async () => {
    render(<SheetFormDemo />);
    fireEvent.click(screen.getByRole('button', { name: /send feedback/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText('Quick Feedback')).not.toBeInTheDocument());
  });

  it('fires each toast variant', () => {
    render(<SheetFormDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Default' }));
    expect(toastMock).toHaveBeenCalledWith('Default toast notification');
    fireEvent.click(screen.getByRole('button', { name: /^Success/ }));
    expect(toastMock.success).toHaveBeenCalledWith('Action completed successfully!');
    fireEvent.click(screen.getByRole('button', { name: /^Error/ }));
    expect(toastMock.error).toHaveBeenCalledWith('Something went wrong.');
    fireEvent.click(screen.getByRole('button', { name: /^Warning/ }));
    expect(toastMock.warning).toHaveBeenCalledWith('Please review before continuing.');
    fireEvent.click(screen.getByRole('button', { name: /^Info/ }));
    expect(toastMock.info).toHaveBeenCalledWith('Here is some useful information.');
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: /^Promise/ }));
    expect(toastMock.promise).toHaveBeenCalledTimes(1);
    expect(toastMock.promise.mock.calls[0][1]).toMatchObject({
      loading: 'Loading...',
      success: 'Data loaded!',
      error: 'Failed to load.'
    });
    vi.runAllTimers();
    vi.useRealTimers();
  });
});
