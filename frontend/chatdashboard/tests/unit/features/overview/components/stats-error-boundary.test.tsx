import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const refresh = vi.fn();
const captureClientError = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('@/lib/sentry', () => ({ captureClientError: (e: Error) => captureClientError(e) }));

import { StatsErrorBoundary } from '@/features/overview/components/stats-error-boundary';
import AreaStatsError from '@/app/dashboard/overview/@area_stats/error';
import BarStatsError from '@/app/dashboard/overview/@bar_stats/error';
import PieStatsError from '@/app/dashboard/overview/@pie_stats/error';
import SalesError from '@/app/dashboard/overview/@sales/error';
import OverviewError from '@/app/dashboard/overview/error';

describe('StatsErrorBoundary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reports the error, shows the message and retries by refreshing and resetting', () => {
    const error = new Error('boom');
    const reset = vi.fn();
    render(<StatsErrorBoundary error={error} reset={reset} subject='widgets' />);

    expect(captureClientError).toHaveBeenCalledWith(error);
    expect(screen.getByText('Failed to load widgets: boom')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it.each([
    [AreaStatsError, 'Failed to load area statistics: x'],
    [BarStatsError, 'Failed to load statistics: x'],
    [PieStatsError, 'Failed to load pie statistics: x'],
    [SalesError, 'Failed to load sales data: x'],
    [OverviewError, 'Failed to load statistics: x']
  ])('route error file %# keeps its message', (Route, text) => {
    render(<Route error={new Error('x')} reset={() => {}} />);
    expect(screen.getByText(text)).toBeTruthy();
  });
});
