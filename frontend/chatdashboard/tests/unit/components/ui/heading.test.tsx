import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Heading } from '@/components/ui/heading';

describe('Heading', () => {
  it('renders the page title as the level-one heading', () => {
    render(<Heading title='Customers' description='Manage customers' />);
    expect(screen.getByRole('heading', { level: 1, name: 'Customers' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
  });
});
