import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { z } from 'zod';
import { useAppForm } from '@/lib/form';

vi.mock('@/components/file-uploader', () => ({
  FileUploader: ({ value, onValueChange, maxSize, maxFiles }: any) => (
    <div data-testid='uploader' data-max-size={maxSize} data-max-files={maxFiles}>
      <span data-testid='count'>{value?.length ?? 'none'}</span>
      <button onClick={() => onValueChange([new File(['x'], 'direct.png')])}>set-array</button>
      <button onClick={() => onValueChange((prev: File[]) => [...prev, new File(['y'], 'fn.png')])}>
        set-fn
      </button>
    </div>
  )
}));

afterEach(cleanup);

function Harness({ onForm, extra }: { onForm: (f: any) => void; extra?: object }) {
  const form = useAppForm({
    defaultValues: { files: undefined as File[] | undefined },
    validators: {
      onSubmit: z.object({ files: z.array(z.any(), { error: 'Upload a file' }) }) as never
    },
    onSubmit: () => {}
  });
  onForm(form);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <form.AppField name='files'>
        {(field) => (
          <field.FileUploadField label='Avatar' required description='png only' {...extra} />
        )}
      </form.AppField>
    </form>
  );
}

describe('FileUploadField', () => {
  it('passes defaults to the uploader and shows label/description', () => {
    render(<Harness onForm={() => {}} />);
    expect(screen.getByText('Avatar *')).toBeInTheDocument();
    expect(screen.getByText('png only')).toBeInTheDocument();
    const up = screen.getByTestId('uploader');
    expect(up).toHaveAttribute('data-max-size', String(5 * 1024 * 1024));
    expect(up).toHaveAttribute('data-max-files', '1');
    expect(screen.getByTestId('count')).toHaveTextContent('none');
  });

  it('honours custom limits', () => {
    render(<Harness onForm={() => {}} extra={{ maxSize: 10, maxFiles: 3 }} />);
    expect(screen.getByTestId('uploader')).toHaveAttribute('data-max-size', '10');
    expect(screen.getByTestId('uploader')).toHaveAttribute('data-max-files', '3');
  });

  it('writes array and functional updates into the form and shows validation errors', async () => {
    let formRef: any;
    render(<Harness onForm={(f) => (formRef = f)} />);
    await act(async () => {
      fireEvent.submit(document.querySelector('form') as HTMLFormElement);
    });
    expect(await screen.findByText('Upload a file')).toBeInTheDocument();

    fireEvent.click(screen.getByText('set-array'));
    await waitFor(() => expect(formRef.state.values.files).toHaveLength(1));
    expect(formRef.state.values.files[0].name).toBe('direct.png');

    fireEvent.click(screen.getByText('set-fn'));
    await waitFor(() => expect(formRef.state.values.files).toHaveLength(2));
    expect(screen.getByTestId('count')).toHaveTextContent('2');
  });

  it('functional update works from an undefined value', async () => {
    let formRef: any;
    render(<Harness onForm={(f) => (formRef = f)} />);
    fireEvent.click(screen.getByText('set-fn'));
    await waitFor(() => expect(formRef.state.values.files).toHaveLength(1));
  });
});
