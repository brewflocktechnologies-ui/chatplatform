import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/components/layout/page-container', () => ({
  default: ({
    pageTitle,
    pageHeaderAction,
    children
  }: {
    pageTitle: string;
    pageHeaderAction: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <h1>{pageTitle}</h1>
      {pageHeaderAction}
      {children}
    </div>
  )
}));

import IconsViewPage from '@/features/elements/components/icons-view-page';
import { Icons } from '@/components/icons';

afterEach(cleanup);

describe('IconsViewPage', () => {
  it('renders the title, an external Tabler link and every icon name', () => {
    render(<IconsViewPage />);

    expect(screen.getByRole('heading', { name: 'Icons' })).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Tabler Icons/ });
    expect(link).toHaveAttribute('href', 'https://tabler.io/icons');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText(Object.keys(Icons)[0])).toBeInTheDocument();
  });

  it('filters icons by a case-insensitive search', () => {
    render(<IconsViewPage />);
    const names = Object.keys(Icons);
    const target = names.find((n) => n.length > 3)!;

    fireEvent.change(screen.getByPlaceholderText('Search icons...'), {
      target: { value: target.toUpperCase() }
    });

    expect(screen.getByText(target)).toBeInTheDocument();
    const others = names.filter((n) => !n.toLowerCase().includes(target.toLowerCase()));
    expect(others.length).toBeGreaterThan(0);
    expect(screen.queryByText(others[0])).not.toBeInTheDocument();
  });

  it('shows an empty state when nothing matches', () => {
    render(<IconsViewPage />);

    fireEvent.change(screen.getByPlaceholderText('Search icons...'), {
      target: { value: 'zzz-no-such-icon' }
    });

    expect(screen.getByText(/No icons found matching/)).toHaveTextContent('zzz-no-such-icon');
  });
});
