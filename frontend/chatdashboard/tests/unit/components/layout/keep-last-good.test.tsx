import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

import { KeepLastGood } from '@/components/layout/keep-last-good';

afterEach(() => {
  cleanup();
  refresh.mockClear();
});

/** Stands in for a table row holding an open edit form: local state that must survive. */
function Row({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <span>{label}</span>
      <button type='button' onClick={() => setOpen(true)}>
        Edit
      </button>
      {open && <div role='dialog'>Edit form</div>}
    </div>
  );
}

describe('KeepLastGood', () => {
  it('renders the content when the load succeeds', () => {
    render(
      <KeepLastGood>
        <Row label='ref-test.example.com' />
      </KeepLastGood>
    );
    expect(screen.getByText('ref-test.example.com')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the last content mounted, with an open form, when a refresh fails', () => {
    const { rerender } = render(
      <KeepLastGood>
        <Row label='ref-test.example.com' />
      </KeepLastGood>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Edit form');

    rerender(<KeepLastGood error='Websites API responded with 500'>{null}</KeepLastGood>);

    expect(screen.getByText('ref-test.example.com')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent('Edit form');
    expect(screen.getByRole('alert')).toHaveTextContent(
      "Couldn't refresh (Websites API responded with 500). Showing the last loaded data."
    );
  });

  it('shows the newest content and drops the banner once a refresh succeeds again', () => {
    const { rerender } = render(
      <KeepLastGood>
        <Row label='old' />
      </KeepLastGood>
    );
    rerender(<KeepLastGood error='down'>{null}</KeepLastGood>);
    rerender(
      <KeepLastGood>
        <Row label='new' />
      </KeepLastGood>
    );

    expect(screen.getByText('new')).toBeInTheDocument();
    expect(screen.queryByText('old')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the error box when the very first load fails', () => {
    render(<KeepLastGood error='Websites API is unreachable'>{null}</KeepLastGood>);

    expect(screen.getByRole('alert')).toHaveTextContent('Websites API is unreachable');
    expect(screen.queryByText(/Showing the last loaded data/)).not.toBeInTheDocument();
  });

  it('retries by refreshing the server page', () => {
    render(<KeepLastGood error='down'>{null}</KeepLastGood>);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
