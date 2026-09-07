import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Breadcrumbs } from '@/components/breadcrumbs';

const usePathname = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => usePathname()
}));

beforeEach(() => {
  usePathname.mockReset();
});

describe('Breadcrumbs', () => {
  it('renders nothing for the root path', () => {
    usePathname.mockReturnValue('/');
    const { container } = render(<Breadcrumbs />);
    expect(container).toBeEmptyDOMElement();
  });

  it('links intermediate crumbs and marks the last as the current page', () => {
    usePathname.mockReturnValue('/dashboard/customers');
    render(<Breadcrumbs />);
    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    // The final crumb is a page marker (aria-current), not a real anchor.
    const current = screen.getByText('Customers');
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current.tagName).not.toBe('A');
  });

  it('renders a single page crumb for /dashboard', () => {
    usePathname.mockReturnValue('/dashboard');
    render(<Breadcrumbs />);
    const current = screen.getByText('Dashboard');
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current.tagName).not.toBe('A');
  });
});
