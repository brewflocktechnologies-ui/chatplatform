import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

const toastMock = vi.hoisted(() => ({
  error: vi.fn(),
  promise: vi.fn()
}));
vi.mock('sonner', () => ({ toast: toastMock }));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />
}));

// Replace react-dropzone with a stub that exposes `onDrop` and the config the
// component passes in, so every drop branch can be driven directly.
const dz = vi.hoisted(() => ({
  props: null as any,
  isDragActive: false
}));
vi.mock('react-dropzone', () => ({
  default: (props: any) => {
    dz.props = props;
    return props.children({
      getRootProps: () => ({ 'data-testid': 'root' }),
      getInputProps: () => ({ type: 'file' }),
      isDragActive: dz.isDragActive
    });
  }
}));

import { FileUploader } from '@/components/file-uploader';

const makeFile = (name = 'a.png', size = 10) =>
  new File([new Uint8Array(size)], name, { type: 'image/png' });

beforeEach(() => {
  // Base UI ScrollArea calls getAnimations(), which jsdom lacks.
  (Element.prototype as any).getAnimations = () => [];
  dz.isDragActive = false;
  toastMock.error.mockClear();
  toastMock.promise.mockClear();
  (URL as any).createObjectURL = vi.fn((f: File) => `blob:${f.name}`);
  (URL as any).revokeObjectURL = vi.fn();
});
afterEach(cleanup);

describe('FileUploader', () => {
  it('shows the single-file hint by default', () => {
    render(<FileUploader />);
    expect(screen.getByText(/You can upload a file with/)).toBeInTheDocument();
    expect(dz.props.multiple).toBe(false);
    expect(dz.props.disabled).toBe(false);
  });

  it('shows the multi-file hint, and "multiple" for Infinity', () => {
    const { rerender } = render(<FileUploader maxFiles={4} maxSize={1024} />);
    expect(screen.getByText(/4\s+files \(up to 1 KB each\)/)).toBeInTheDocument();
    expect(dz.props.multiple).toBe(true);
    rerender(<FileUploader maxFiles={Infinity} />);
    expect(screen.getByText(/multiple\s+files/)).toBeInTheDocument();
  });

  it('shows the drag-active message', () => {
    dz.isDragActive = true;
    render(<FileUploader />);
    expect(screen.getByText('Drop the files here')).toBeInTheDocument();
  });

  it('adds dropped files (uncontrolled) with previews and notifies onValueChange', async () => {
    const onValueChange = vi.fn();
    render(<FileUploader onValueChange={onValueChange} maxFiles={3} />);
    await act(async () => dz.props.onDrop([makeFile('a.png', 2048)], []));
    expect(screen.getByText('a.png')).toBeInTheDocument();
    expect(screen.getByText('2 KB')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'a.png' })).toHaveAttribute('src', 'blob:a.png');
    expect(onValueChange).toHaveBeenCalledTimes(1);

    await act(async () => dz.props.onDrop([makeFile('b.png')], []));
    expect(screen.getByText('b.png')).toBeInTheDocument();
    expect(screen.getByText('a.png')).toBeInTheDocument();
  });

  it('rejects more than one file at once when single-file', async () => {
    const onValueChange = vi.fn();
    render(<FileUploader onValueChange={onValueChange} />);
    await act(async () => dz.props.onDrop([makeFile('a.png'), makeFile('b.png')], []));
    expect(toastMock.error).toHaveBeenCalledWith('Cannot upload more than 1 file at a time');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('rejects when the total would exceed maxFiles', async () => {
    render(<FileUploader maxFiles={2} />);
    await act(async () => dz.props.onDrop([makeFile('a.png'), makeFile('b.png')], []));
    await act(async () => dz.props.onDrop([makeFile('c.png')], []));
    expect(toastMock.error).toHaveBeenCalledWith('Cannot upload more than 2 files');
    expect(screen.queryByText('c.png')).not.toBeInTheDocument();
    // the uploader is now full
    expect(dz.props.disabled).toBe(true);
  });

  it('reports rejected files', async () => {
    render(<FileUploader maxFiles={2} />);
    const bad = makeFile('bad.txt');
    await act(async () => dz.props.onDrop([makeFile('a.png')], [{ file: bad, errors: [] }]));
    expect(toastMock.error).toHaveBeenCalledWith('File bad.txt was rejected');
    expect(screen.getByText('a.png')).toBeInTheDocument();
  });

  it('runs onUpload through toast.promise and clears files on success', async () => {
    const onUpload = vi.fn().mockResolvedValue(undefined);
    let opts: any;
    toastMock.promise.mockImplementation((_p: Promise<void>, o: any) => {
      opts = o;
    });
    render(<FileUploader onUpload={onUpload} maxFiles={3} />);
    await act(async () => dz.props.onDrop([makeFile('a.png'), makeFile('b.png')], []));
    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(onUpload.mock.calls[0][0]).toHaveLength(2);
    expect(opts.loading).toBe('Uploading 2 files...');
    expect(opts.error).toBe('Failed to upload 2 files');
    expect(screen.getByText('b.png')).toBeInTheDocument();

    let message = '';
    act(() => {
      message = opts.success();
    });
    expect(message).toBe('2 files uploaded');
    expect(screen.queryByText('b.png')).not.toBeInTheDocument();
  });

  it('removes a file via its remove button (controlled)', async () => {
    const onValueChange = vi.fn();
    const f1 = Object.assign(makeFile('one.png'), { preview: 'blob:one' });
    const f2 = makeFile('two.png'); // no preview => no thumbnail
    render(<FileUploader value={[f1, f2]} onValueChange={onValueChange} maxFiles={5} />);
    expect(screen.getAllByRole('img')).toHaveLength(1);
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove file' })[0]);
    expect(onValueChange).toHaveBeenLastCalledWith([f2]);
  });

  it('shows progress and blocks removal until the upload completes', () => {
    const f1 = makeFile('one.png');
    const f2 = makeFile('two.png');
    const f3 = makeFile('three.png');
    render(
      <FileUploader
        value={[f1, f2, f3]}
        maxFiles={5}
        progresses={{ 'one.png': 40, 'two.png': 100 }}
      />
    );
    const buttons = screen.getAllByRole('button', { name: 'Remove file' });
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeEnabled();
    expect(buttons[2]).toBeEnabled();
    expect(screen.getAllByRole('progressbar')).toHaveLength(2);
  });

  it('is disabled when the disabled prop is set', () => {
    render(<FileUploader disabled className='extra' />);
    expect(dz.props.disabled).toBe(true);
  });

  it('revokes preview URLs on unmount', () => {
    const f1 = Object.assign(makeFile('one.png'), { preview: 'blob:one' });
    const f2 = makeFile('two.png');
    const { unmount } = render(<FileUploader value={[f1, f2]} maxFiles={5} />);
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:one');
  });

  it('does nothing on unmount without files', () => {
    const { unmount } = render(<FileUploader />);
    unmount();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });
});
