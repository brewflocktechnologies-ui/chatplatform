import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SearchInput from '@/components/search-input';

const toggle = vi.fn();
vi.mock('kbar', () => ({
  useKBar: () => ({ query: { toggle } })
}));

beforeEach(() => {
  toggle.mockReset();
});

describe('SearchInput', () => {
  it('renders the search trigger with its shortcut hint', () => {
    render(<SearchInput />);
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    expect(screen.getByText('K')).toBeInTheDocument();
  });

  it('opens the command palette on click', () => {
    render(<SearchInput />);
    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    expect(toggle).toHaveBeenCalledOnce();
  });
});
