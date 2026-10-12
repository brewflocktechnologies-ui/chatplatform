import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/features/overview/components/area-graph', () => ({
  AreaGraph: () => <div data-testid='area' />
}));
vi.mock('@/features/overview/components/bar-graph', () => ({
  BarGraph: () => <div data-testid='bar' />
}));
vi.mock('@/features/overview/components/pie-graph', () => ({
  PieGraph: () => <div data-testid='pie' />
}));
vi.mock('@/components/layout/page-container', () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>
}));

import OverViewPage from '@/features/overview/components/overview';
import { RecentSales } from '@/features/overview/components/recent-sales';
import { StatsErrorAlert } from '@/features/overview/components/stats-error';
import { AreaGraphSkeleton } from '@/features/overview/components/area-graph-skeleton';
import { BarGraphSkeleton } from '@/features/overview/components/bar-graph-skeleton';
import { PieGraphSkeleton } from '@/features/overview/components/pie-graph-skeleton';
import { RecentSalesSkeleton } from '@/features/overview/components/recent-sales-skeleton';

describe('OverViewPage', () => {
  it('renders stat cards, graphs and tabs', () => {
    render(<OverViewPage />);
    expect(screen.getByText(/Hi, Welcome back/)).toBeInTheDocument();
    for (const label of ['Total Revenue', 'New Customers', 'Active Accounts', 'Growth Rate']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText('$1,250.00')).toBeInTheDocument();
    expect(screen.getByTestId('area')).toBeInTheDocument();
    expect(screen.getByTestId('bar')).toBeInTheDocument();
    expect(screen.getByTestId('pie')).toBeInTheDocument();
    expect(screen.getByText('Recent Sales')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Analytics' })).toHaveAttribute('aria-disabled', 'true');
  });
});

describe('RecentSales', () => {
  it('lists every sale with name, email and amount', () => {
    render(<RecentSales />);
    expect(screen.getByText('You made 265 sales this month.')).toBeInTheDocument();
    expect(screen.getByText('Olivia Martin')).toBeInTheDocument();
    expect(screen.getByText('olivia.martin@email.com')).toBeInTheDocument();
    expect(screen.getByText('+$1,999.00')).toBeInTheDocument();
    expect(screen.getAllByText('+$39.00')).toHaveLength(2);
    expect(screen.getByText('Sofia Davis')).toBeInTheDocument();
  });
});

describe('StatsErrorAlert', () => {
  it('shows message and action', () => {
    render(<StatsErrorAlert message='Boom' action={<button>Retry</button>} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Boom')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});

describe('skeletons', () => {
  it.each([
    ['area', AreaGraphSkeleton],
    ['bar', BarGraphSkeleton],
    ['pie', PieGraphSkeleton],
    ['sales', RecentSalesSkeleton]
  ])('%s skeleton renders placeholders', (_n, Comp) => {
    const { container } = render(<Comp />);
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });
});
