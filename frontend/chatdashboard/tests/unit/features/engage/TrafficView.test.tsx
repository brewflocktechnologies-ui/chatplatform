import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import TrafficView from '@/features/engage/TrafficView';
import { useCustomerStore, type Customer } from '@/features/engage/useCustomerStore';

const MOCK_CUSTOMERS: Customer[] = [
  {
    name: 'You',
    group: 'Oxnia',
    chattingWith: 'Maria',
    country: 'India',
    state: 'Maharashtra',
    activity: 'Chatting',
    status: 'online'
  },
  {
    name: 'Amit Shah',
    group: 'SupportTeam',
    chattingWith: '',
    country: 'India',
    state: 'Delhi',
    activity: 'Browsing',
    status: 'offline'
  },
  {
    name: 'Samantha',
    group: 'Sales',
    chattingWith: 'John',
    country: 'India',
    state: 'Karnataka',
    activity: 'Waiting for reply',
    status: 'online'
  },
  {
    name: 'Rita',
    group: 'SupportTeam',
    chattingWith: '',
    country: 'India',
    state: 'Kerala',
    activity: 'Supervised',
    status: 'offline'
  }
];

beforeEach(() => {
  useCustomerStore.setState({ customerData: MOCK_CUSTOMERS });
});

describe('TrafficView', () => {
  it('renders the heading, table headers and every customer row', () => {
    render(<TrafficView />);
    expect(screen.getByRole('heading', { name: '📊 Traffic Insights' })).toBeInTheDocument();

    for (const header of ['Name', 'Group', 'Activity', 'Chatting With', 'Country', 'State']) {
      expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument();
    }

    for (const customer of MOCK_CUSTOMERS) {
      expect(screen.getByRole('row', { name: new RegExp(customer.name) })).toBeInTheDocument();
    }
  });

  it('shows the filter counts computed from the store', () => {
    render(<TrafficView />);
    expect(screen.getByRole('button', { name: 'All Customers (4)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chatting (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Supervised (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Waiting for Reply (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Browsing (1)' })).toBeInTheDocument();
  });

  it('filters the table rows by the selected activity', () => {
    render(<TrafficView />);
    fireEvent.click(screen.getByRole('button', { name: 'Chatting (1)' }));

    expect(screen.getByText('Showing data for:')).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.queryByText('Amit Shah')).not.toBeInTheDocument();
    expect(screen.queryByText('Samantha')).not.toBeInTheDocument();
  });

  it('shows no rows when the selected filter has no matches', () => {
    render(<TrafficView />);
    fireEvent.click(screen.getByRole('button', { name: 'Queued (0)' }));

    expect(screen.queryByRole('row', { name: /You/ })).not.toBeInTheDocument();
  });

  it('opens the contact profile when a row is clicked', () => {
    render(<TrafficView />);
    fireEvent.click(screen.getByRole('row', { name: /You/ }));

    // The name appears in both the table row and the profile header.
    expect(screen.getAllByText('You')).toHaveLength(2);
    expect(screen.getByText('you@example.com')).toBeInTheDocument();
    expect(screen.getByText('online')).toBeInTheDocument();
  });
});
