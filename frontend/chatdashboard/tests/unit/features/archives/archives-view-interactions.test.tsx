import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

const h = vi.hoisted(() => ({ chats: [] as any[] }));

vi.mock('@/constants/mock-api-archives', () => ({
  get MOCK_ARCHIVED_CHATS() {
    return h.chats;
  },
  TOTAL_ARCHIVED_COUNT: 42
}));
vi.mock('@/features/archives/components/archives-list', () => ({
  ArchivesList: (p: any) => (
    <div>
      <span data-testid='total'>{p.totalCount}</span>
      <span data-testid='selected'>{p.selectedId}</span>
      {p.chats.map((c: any) => (
        <button key={c.id} type='button' onClick={() => p.onSelect(c.id)}>
          pick-{c.id}
        </button>
      ))}
    </div>
  )
}));
vi.mock('@/features/archives/components/archives-transcript', () => ({
  ArchivesTranscript: (p: any) => (
    <div>
      <span data-testid='active'>{p.chat.id}</span>
      <span data-testid='tags'>{p.chat.tags.join(',')}</span>
      <button type='button' onClick={p.onToggleDetails}>
        toggle-details
      </button>
      <button type='button' onClick={() => p.onNavigateChat('chat-2')}>
        nav
      </button>
      <button type='button' onClick={() => p.onAddTag(p.chat.id, 'new')}>
        add-tag
      </button>
      <button type='button' onClick={() => p.onRemoveTag(p.chat.id, 'old')}>
        rm-tag
      </button>
    </div>
  )
}));
vi.mock('@/features/archives/components/archives-details', () => ({
  ArchivesDetails: (p: any) => (
    <button type='button' onClick={p.onToggle}>
      hide-details
    </button>
  )
}));

import ArchivesView from '@/features/archives/components/archives-view';

const mk = (id: string, tags: string[] = []) => ({ id, tags });

beforeEach(() => {
  h.chats = [mk('chat-1', ['x']), mk('chat-2', ['old']), mk('chat-5', ['old'])];
});
afterEach(() => cleanup());

describe('ArchivesView interactions', () => {
  it('defaults to chat-5 and passes total count', () => {
    render(<ArchivesView />);
    expect(screen.getByTestId('active')).toHaveTextContent('chat-5');
    expect(screen.getByTestId('total')).toHaveTextContent('42');
  });

  it('falls back to first chat when the default is missing', () => {
    h.chats = [mk('chat-1')];
    render(<ArchivesView />);
    expect(screen.getByTestId('active')).toHaveTextContent('chat-1');
  });

  it('selects and navigates between chats', () => {
    render(<ArchivesView />);
    fireEvent.click(screen.getByText('pick-chat-1'));
    expect(screen.getByTestId('active')).toHaveTextContent('chat-1');
    fireEvent.click(screen.getByText('nav'));
    expect(screen.getByTestId('active')).toHaveTextContent('chat-2');
  });

  it('adds a tag only to the targeted chat and avoids duplicates', () => {
    render(<ArchivesView />);
    fireEvent.click(screen.getByText('add-tag'));
    expect(screen.getByTestId('tags')).toHaveTextContent('old,new');
    fireEvent.click(screen.getByText('add-tag'));
    expect(screen.getByTestId('tags')).toHaveTextContent('old,new');
    fireEvent.click(screen.getByText('pick-chat-1'));
    expect(screen.getByTestId('tags')).toHaveTextContent('x');
    expect(screen.getByTestId('tags').textContent).not.toContain('new');
  });

  it('removes a tag from the targeted chat only', () => {
    render(<ArchivesView />);
    fireEvent.click(screen.getByText('rm-tag'));
    expect(screen.getByTestId('tags').textContent).toBe('');
    fireEvent.click(screen.getByText('pick-chat-2'));
    expect(screen.getByTestId('tags')).toHaveTextContent('old');
  });

  it('shows the empty transcript state when there are no chats', () => {
    h.chats = [];
    render(<ArchivesView />);
    expect(screen.getByText('Select an archived chat to inspect.')).toBeInTheDocument();
    expect(screen.queryByText('hide-details')).toBeNull();
  });

  it('collapses details and reopens with the header chevron', () => {
    render(<ArchivesView />);
    fireEvent.click(screen.getByText('hide-details'));
    fireEvent.click(screen.getByLabelText('Open Details Panel'));
    expect(screen.getByText('hide-details')).toBeInTheDocument();
    fireEvent.click(screen.getByText('toggle-details'));
    expect(screen.queryByText('hide-details')).toBeNull();
  });
});
