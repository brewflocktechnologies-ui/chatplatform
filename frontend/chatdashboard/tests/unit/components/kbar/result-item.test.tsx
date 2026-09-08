import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ActionImpl } from 'kbar';
import ResultItem from '@/components/kbar/result-item';

const makeAction = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'dashboardAction',
    name: 'Dashboard',
    subtitle: 'Go to Dashboard',
    shortcut: ['d', 'd'],
    icon: null,
    ancestors: [],
    ...overrides
  }) as unknown as ActionImpl;

describe('ResultItem', () => {
  it('renders the action name and subtitle', () => {
    render(<ResultItem action={makeAction()} active={false} currentRootActionId='' />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
  });

  it('renders each shortcut key', () => {
    render(<ResultItem action={makeAction()} active={false} currentRootActionId='' />);
    expect(screen.getAllByText('d')).toHaveLength(2);
  });

  it('omits the shortcut row when there is none', () => {
    render(
      <ResultItem
        action={makeAction({ shortcut: undefined })}
        active={false}
        currentRootActionId=''
      />
    );
    expect(screen.queryByText('d')).not.toBeInTheDocument();
  });

  it('shows ancestors leading to the action', () => {
    const action = makeAction({
      ancestors: [{ id: 'parent', name: 'Settings' }]
    });
    render(<ResultItem action={action} active={false} currentRootActionId='' />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('hides ancestors up to the current root action', () => {
    const action = makeAction({
      ancestors: [
        { id: 'root', name: 'Root' },
        { id: 'child', name: 'Child' }
      ]
    });
    render(<ResultItem action={action} active={false} currentRootActionId='root' />);
    expect(screen.queryByText('Root')).not.toBeInTheDocument();
    expect(screen.getByText('Child')).toBeInTheDocument();
  });
});
