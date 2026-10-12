import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import ContactProfile from '@/features/engage/ContactProfile';

const contact = {
  name: 'Ada Lovelace',
  phone: '555-0100',
  address: 'London',
  joinedDate: 'Jan 1, 2020',
  notes: 'VIP customer',
  status: 'offline' as const
};

function Harness() {
  const [expanded, setExpanded] = useState(false);
  return <ContactProfile contact={contact} expanded={expanded} setExpanded={setExpanded} />;
}

describe('ContactProfile collapsed rail', () => {
  it('requests expansion when a rail icon is clicked', () => {
    const setExpanded = vi.fn();
    render(<ContactProfile contact={contact} expanded={false} setExpanded={setExpanded} />);
    fireEvent.click(screen.getByTitle('Address'));
    expect(setExpanded).toHaveBeenCalledWith(true);
  });

  it('expands directly onto the clicked tab and shows offline status', () => {
    render(<Harness />);
    fireEvent.click(screen.getByTitle('Joined'));
    expect(screen.getByText('Jan 1, 2020')).toBeInTheDocument();
    expect(screen.getByText('offline')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Close'));
    expect(screen.queryByText('Jan 1, 2020')).toBeNull();
  });
});
