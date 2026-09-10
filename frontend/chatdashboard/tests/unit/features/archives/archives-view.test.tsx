import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import ArchivesView from '@/features/archives/components/archives-view';
import type { DetailsTab } from '@/features/archives/components/archives-details';
import type { ArchivedChat } from '@/features/archives/types';

const { detailsProps } = vi.hoisted(() => ({
  detailsProps: { current: undefined as unknown }
}));

vi.mock('@/features/archives/components/archives-details', () => ({
  ArchivesDetails: (props: {
    isOpen: boolean;
    onToggle: () => void;
    activeTab: DetailsTab;
    onTabChange: (tab: DetailsTab) => void;
    chat: ArchivedChat;
  }) => {
    detailsProps.current = props;
    return (
      <div data-testid='details-panel'>
        <span data-testid='active-tab'>{props.activeTab}</span>
        <button type='button' onClick={props.onToggle}>
          collapse
        </button>
        <button type='button' onClick={() => props.onTabChange('apps')}>
          switch-to-apps
        </button>
      </div>
    );
  }
}));

vi.mock('@/features/archives/components/archives-list', () => ({
  ArchivesList: ({ selectedId }: { selectedId: string }) => (
    <div data-testid='archives-list'>selected:{selectedId}</div>
  )
}));

vi.mock('@/features/archives/components/archives-transcript', () => ({
  ArchivesTranscript: ({
    isDetailsOpen,
    onToggleDetails
  }: {
    isDetailsOpen: boolean;
    onToggleDetails: () => void;
  }) => (
    <div data-testid='archives-transcript'>
      detailsOpen:{String(isDetailsOpen)}
      <button type='button' onClick={onToggleDetails}>
        toggle-details
      </button>
    </div>
  )
}));

describe('ArchivesView', () => {
  afterEach(() => {
    cleanup();
  });

  it('opens the details panel with the info tab selected by default', () => {
    render(<ArchivesView />);
    expect(screen.getByTestId('details-panel')).toBeInTheDocument();
    expect(screen.getByTestId('active-tab')).toHaveTextContent('info');
  });

  it('shows the reopen rail when the details panel is collapsed', () => {
    render(<ArchivesView />);
    fireEvent.click(screen.getByText('collapse'));

    expect(screen.queryByTestId('details-panel')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /customer details/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /notes & canned responses/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /apps & integrations/i })).toBeInTheDocument();
  });

  it.each([
    ['Customer Details', 'info'],
    ['Notes & Canned Responses', 'canned'],
    ['Apps & Integrations', 'apps']
  ] as const)('reopens the details panel on the %s tab', (buttonName, expectedTab) => {
    render(<ArchivesView />);
    fireEvent.click(screen.getByText('collapse'));

    fireEvent.click(screen.getByRole('button', { name: new RegExp(buttonName, 'i') }));

    expect(screen.getByTestId('details-panel')).toBeInTheDocument();
    expect(screen.getByTestId('active-tab')).toHaveTextContent(expectedTab);
  });

  it('lets the details panel change the active tab', () => {
    render(<ArchivesView />);
    fireEvent.click(screen.getByText('switch-to-apps'));

    expect(screen.getByTestId('active-tab')).toHaveTextContent('apps');
  });
});