import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ActionImpl } from 'kbar';
import ResultItem from '@/components/kbar/result-item';

const makeAction = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'a',
    name: 'Action',
    subtitle: undefined,
    shortcut: [],
    icon: <i data-testid='icon' />,
    ancestors: [],
    ...overrides
  }) as unknown as ActionImpl;

describe('ResultItem (extra branches)', () => {
  it('highlights the active row and renders the icon', () => {
    const { container } = render(
      <ResultItem action={makeAction()} active currentRootActionId='' />
    );
    expect(container.firstChild).toHaveClass('bg-accent');
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('is not highlighted when inactive', () => {
    const { container } = render(
      <ResultItem action={makeAction()} active={false} currentRootActionId='' />
    );
    expect(container.firstChild).not.toHaveClass('bg-accent');
  });

  it('omits the subtitle and an empty shortcut list', () => {
    const { container } = render(
      <ResultItem action={makeAction()} active={false} currentRootActionId='' />
    );
    expect(container.querySelector('.grid-flow-col')).toBeNull();
    expect(container.querySelector('.text-xs')).toBeNull();
  });

  it('keeps every ancestor when the root action is not among them', () => {
    const action = makeAction({
      ancestors: [
        { id: 'one', name: 'One' },
        { id: 'two', name: 'Two' }
      ]
    });
    render(<ResultItem action={action} active={false} currentRootActionId='missing' />);
    expect(screen.getByText('One')).toBeInTheDocument();
    expect(screen.getByText('Two')).toBeInTheDocument();
  });
});
