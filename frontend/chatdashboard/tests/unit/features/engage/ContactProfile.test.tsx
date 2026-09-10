import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ContactProfile from '@/features/engage/ContactProfile';

type TestContact = NonNullable<React.ComponentProps<typeof ContactProfile>['contact']>;

const contact: TestContact = {
  name: 'Ada Lovelace',
  phone: '555-0100',
  address: 'London',
  joinedDate: 'Jan 1, 2020',
  notes: 'VIP customer',
  status: 'online'
};

function renderProfile(expanded = true, profile: TestContact = contact) {
  const setExpanded = vi.fn();
  const view = render(
    <ContactProfile contact={profile} expanded={expanded} setExpanded={setExpanded} />
  );
  return {
    setExpanded,
    rerender: (next: boolean) =>
      view.rerender(<ContactProfile contact={contact} expanded={next} setExpanded={setExpanded} />)
  };
}

describe('ContactProfile', () => {
  it('shows the collapsed icon rail when not expanded', () => {
    render(<ContactProfile contact={null} expanded={false} setExpanded={vi.fn()} />);
    for (const label of ['Phone', 'Address', 'Joined', 'More Info']) {
      expect(screen.getByTitle(label)).toBeInTheDocument();
    }
  });

  it('shows the contact details when expanded', () => {
    renderProfile();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('adalovelace@example.com')).toBeInTheDocument();
    expect(screen.getByText('online')).toBeInTheDocument();
    expect(screen.getByText('555-0100')).toBeInTheDocument();
  });

  it('falls back to a placeholder message when no contact is selected', () => {
    render(<ContactProfile contact={null} expanded setExpanded={vi.fn()} />);
    expect(screen.getByText('Select a contact to view their profile')).toBeInTheDocument();
  });

  it('switches tab content on icon click', () => {
    renderProfile();
    fireEvent.click(screen.getByTitle('Address'));
    expect(screen.getByText('London')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Joined'));
    expect(screen.getByText('Jan 1, 2020')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('More Info'));
    expect(screen.getByText('VIP customer')).toBeInTheDocument();
  });

  it('shows fallback copy for missing tab values', () => {
    renderProfile(true, { name: 'No Data', status: 'offline' });
    expect(screen.getByText('No phone number available')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Address'));
    expect(screen.getByText('No address provided')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Joined'));
    expect(screen.getByText('Date not available')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('More Info'));
    expect(screen.getByText('No additional info')).toBeInTheDocument();
  });

  it('collapses back to the rail when close is clicked', () => {
    const { setExpanded, rerender } = renderProfile();
    fireEvent.click(screen.getByTitle('Close'));
    expect(setExpanded).toHaveBeenCalledWith(false);
    // The parent is expected to re-render with expanded=false; assert the
    // collapsed rail replaces the profile panel.
    rerender(false);
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();
    for (const label of ['Phone', 'Address', 'Joined', 'More Info']) {
      expect(screen.getByTitle(label)).toBeInTheDocument();
    }
  });
});
