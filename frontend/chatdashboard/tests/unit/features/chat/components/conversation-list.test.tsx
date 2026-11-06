import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';

const { storeState } = vi.hoisted(() => ({
  storeState: { typingMap: {} as Record<string, boolean> }
}));

vi.mock('@/features/chat/utils/store', () => ({
  useChatStore: (sel: (s: typeof storeState) => unknown) => sel(storeState)
}));

import { ConversationList } from '@/features/chat/components/conversation-list';
import type { Conversation } from '@/features/chat/utils/types';

function convo(over: Partial<Conversation> = {}): Conversation {
  return {
    id: 'c1',
    name: 'Alice',
    title: 'Billing question',
    status: 'online',
    unread: 0,
    initials: 'AL',
    messages: [],
    quickReplies: [],
    autoReplies: [],
    ...over
  };
}

const alice = convo({
  id: 'a',
  name: 'Alice',
  unread: 3,
  messages: [
    { id: '1', sender: 'contact', author: 'Alice', text: 'Where is my invoice', timestamp: '09:00' }
  ]
});
const bob = convo({
  id: 'b',
  name: 'Bob',
  title: 'Shipping',
  status: 'offline',
  messages: [{ id: '2', sender: 'user', author: 'Me', text: 'On its way', timestamp: '08:00' }]
});
const carol = convo({ id: 'c', name: 'Carol', status: 'offline', title: 'Empty' });

beforeEach(() => {
  storeState.typingMap = {};
});
afterEach(() => cleanup());

describe('ConversationList', () => {
  it('renders conversations with counts, snippets and unread badge', () => {
    render(
      <ConversationList conversations={[alice, bob, carol]} selectedId='' onSelect={vi.fn()} />
    );
    expect(screen.getByText('1 online')).toBeInTheDocument();
    expect(screen.getByText('Where is my invoice')).toBeInTheDocument();
    expect(screen.getByText('On its way')).toBeInTheDocument();
    expect(screen.getByLabelText('Sent')).toBeInTheDocument();
    expect(screen.getByText('No messages yet')).toBeInTheDocument();
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
  });

  it('selects a conversation and marks the active one', () => {
    const onSelect = vi.fn();
    render(<ConversationList conversations={[alice, bob]} selectedId='b' onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Alice'));
    expect(onSelect).toHaveBeenCalledWith('a');
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[1]).getByRole('button')).toHaveAttribute('aria-current', 'true');
    expect(within(items[0]).getByRole('button')).not.toHaveAttribute('aria-current');
  });

  it('shows typing indicator', () => {
    storeState.typingMap = { a: true };
    render(<ConversationList conversations={[alice]} selectedId='' onSelect={vi.fn()} />);
    expect(screen.getByText('typing...')).toBeInTheDocument();
    expect(screen.queryByText('Where is my invoice')).toBeNull();
  });

  it('filters by unread and online tabs', () => {
    render(<ConversationList conversations={[alice, bob]} selectedId='' onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /^Unread/ }));
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Online/ }));
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^All/ }));
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('searches by name, title and message text and can clear search', () => {
    render(<ConversationList conversations={[alice, bob]} selectedId='' onSelect={vi.fn()} />);
    const input = screen.getByPlaceholderText('Search users or messages...');
    fireEvent.change(input, { target: { value: 'ship' } });
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.queryByText('Alice')).toBeNull();
    fireEvent.change(input, { target: { value: 'invoice' } });
    expect(screen.getByText('Alice')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'bob' } });
    expect(screen.queryByText('Alice')).toBeNull();
    fireEvent.change(input, { target: { value: '   ' } });
    expect(screen.getByText('Alice')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'nomatch' } });
    expect(screen.getByText('No matching conversations')).toBeInTheDocument();
    fireEvent.click(screen.getByText('✕'));
    expect(input).toHaveValue('');
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('shows empty state with no conversations (plural chats)', () => {
    const { rerender } = render(
      <ConversationList conversations={[]} selectedId='' onSelect={vi.fn()} />
    );
    expect(screen.getByText('No active chats yet')).toBeInTheDocument();
    expect(screen.getByText('0 chats')).toBeInTheDocument();
    rerender(<ConversationList conversations={[bob]} selectedId='' onSelect={vi.fn()} />);
    expect(screen.getByText('1 chat')).toBeInTheDocument();
  });
});
