import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SearchInput from '@/components/search-input';

const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

beforeEach(() => {
  dispatchSpy.mockClear();
});

describe('SearchInput', () => {
  it('renders the search trigger with its shortcut hint', () => {
    render(<SearchInput />);
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    expect(screen.getByText('K')).toBeInTheDocument();
  });

  it('opens the command palette on click', () => {
    render(<SearchInput />);
    const button = screen.getByRole('button', { name: /search/i });
    fireEvent.click(button);
    const dispatched = dispatchSpy.mock.calls.map(([event]) => event);
    expect(dispatched.some((e) => e.type === 'kbar:open')).toBe(true);
  });
});
