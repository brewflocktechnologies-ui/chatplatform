import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AlertModal } from '@/components/modal/alert-modal';

afterEach(cleanup);

function setup(props: Partial<React.ComponentProps<typeof AlertModal>> = {}) {
  const onClose = vi.fn();
  const onConfirm = vi.fn();
  render(<AlertModal isOpen onClose={onClose} onConfirm={onConfirm} loading={false} {...props} />);
  return { onClose, onConfirm };
}

describe('AlertModal', () => {
  it('shows default copy when open', () => {
    setup();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
  });

  it('shows custom copy', () => {
    setup({ title: 'Delete chat?', description: 'Gone forever.', confirmLabel: 'Delete' });
    expect(screen.getByText('Delete chat?')).toBeInTheDocument();
    expect(screen.getByText('Gone forever.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    setup({ isOpen: false });
    expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument();
  });

  it('calls onConfirm when confirmed', () => {
    const { onConfirm, onClose } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose on Cancel', () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when dismissed with Escape', () => {
    const { onClose } = setup();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('disables the confirm button while loading', () => {
    setup({ loading: true });
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
  });
});
