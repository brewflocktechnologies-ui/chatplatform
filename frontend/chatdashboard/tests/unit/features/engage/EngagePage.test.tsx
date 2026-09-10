import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import EngagePage from '@/app/dashboard/engage/page';
import { useCustomerStore } from '@/features/engage/useCustomerStore';

const initialData = useCustomerStore.getState().customerData;

beforeEach(() => {
  useCustomerStore.setState({ customerData: initialData });
});

describe('EngagePage', () => {
  it('renders the sidebar with the engage tabs and the traffic view by default', () => {
    render(<EngagePage />);
    expect(screen.getByRole('heading', { name: 'Engage' })).toBeInTheDocument();

    for (const tab of ['traffic', 'campaigns', 'goals']) {
      expect(screen.getByRole('button', { name: tab })).toBeInTheDocument();
    }

    expect(screen.getByRole('heading', { name: '📊 Traffic Insights' })).toBeInTheDocument();
  });

  it('switches to the campaigns view', () => {
    render(<EngagePage />);
    fireEvent.click(screen.getByRole('button', { name: 'campaigns' }));

    expect(screen.getByText('🎯 Marketing Campaigns')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '📊 Traffic Insights' })).not.toBeInTheDocument();
  });

  it('switches to the goals view', () => {
    render(<EngagePage />);
    fireEvent.click(screen.getByRole('button', { name: 'goals' }));

    expect(screen.getByText('🏁 Engagement Goals')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '📊 Traffic Insights' })).not.toBeInTheDocument();
  });

  it('returns to the traffic view after switching away', () => {
    render(<EngagePage />);
    fireEvent.click(screen.getByRole('button', { name: 'goals' }));
    fireEvent.click(screen.getByRole('button', { name: 'traffic' }));

    expect(screen.getByRole('heading', { name: '📊 Traffic Insights' })).toBeInTheDocument();
  });
});
