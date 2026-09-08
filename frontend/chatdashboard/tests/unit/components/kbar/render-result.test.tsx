import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import RenderResults from '@/components/kbar/render-result';

type MatchItem = string | Record<string, unknown>;

let matches: { results: MatchItem[]; rootActionId: string | null } = {
  results: [],
  rootActionId: null
};

vi.mock('kbar', () => ({
  useMatches: () => matches,
  KBarResults: ({
    items,
    onRender
  }: {
    items: MatchItem[];
    onRender: (params: { item: MatchItem; active: boolean }) => React.ReactNode;
  }) => (
    <div>
      {items.map((item, index) => (
        <React.Fragment key={index}>{onRender({ item, active: false })}</React.Fragment>
      ))}
    </div>
  )
}));

beforeEach(() => {
  matches = { results: [], rootActionId: null };
});

describe('RenderResults', () => {
  it('shows an empty state when there are no matches', () => {
    render(<RenderResults />);
    expect(screen.getByText('No results found.')).toBeInTheDocument();
  });

  it('renders string items as section headers', () => {
    matches = { results: ['Navigation'], rootActionId: null };
    render(<RenderResults />);
    expect(screen.getByText('Navigation')).toBeInTheDocument();
  });

  it('renders action items through ResultItem', () => {
    matches = {
      results: [
        'Navigation',
        { id: 'chatAction', name: 'Chat', subtitle: 'Go to Chat', ancestors: [] }
      ],
      rootActionId: null
    };
    render(<RenderResults />);
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Go to Chat')).toBeInTheDocument();
  });
});
