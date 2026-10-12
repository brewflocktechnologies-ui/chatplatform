import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('@/components/ui/popover', async () => {
  const React = await import('react');
  const Ctx = React.createContext<{ open?: boolean; onOpenChange?: (o: boolean) => void }>({});
  return {
    Popover: ({
      open,
      onOpenChange,
      children
    }: {
      open?: boolean;
      onOpenChange?: (o: boolean) => void;
      children: React.ReactNode;
    }) => <Ctx.Provider value={{ open, onOpenChange }}>{children}</Ctx.Provider>,
    PopoverTrigger: ({
      render,
      children
    }: {
      render: React.ReactElement;
      children: React.ReactNode;
    }) => {
      const { onOpenChange } = React.useContext(Ctx);
      return React.cloneElement(
        render,
        { onClick: () => onOpenChange?.(true) } as object,
        children
      );
    },
    PopoverContent: ({ children }: { children: React.ReactNode }) => {
      const { open } = React.useContext(Ctx);
      return open === false ? null : <div>{children}</div>;
    }
  };
});
vi.mock('@/components/ui/dropdown-menu', async () => {
  const React = await import('react');
  return {
    DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuTrigger: ({
      render,
      children
    }: {
      render: React.ReactElement;
      children: React.ReactNode;
    }) => React.cloneElement(render, {}, children),
    DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuItem: ({
      children,
      onClick
    }: {
      children: React.ReactNode;
      onClick?: () => void;
    }) => (
      <button type='button' role='menuitem' onClick={onClick}>
        {children}
      </button>
    )
  };
});

import { ArchivesList } from '@/features/archives/components/archives-list';
import { ArchivesTranscript } from '@/features/archives/components/archives-transcript';
import type { ArchivedChat } from '@/features/archives/types';

function chat(over: Partial<ArchivedChat> = {}): ArchivedChat {
  return {
    id: 'chat-1',
    customerName: 'Tom',
    date: 'Mar 1',
    timestamp: 'Mar 1, 2022 10:00',
    agent: 'Dan',
    snippet: 'Need API help',
    messageCount: 4,
    tags: ['lead'],
    customer: {
      id: 'u1',
      name: 'Tom',
      email: 'tom@x.io',
      initials: 'TM',
      localTime: '10:00',
      location: 'Berlin',
      allChatsCount: 2
    },
    chatInfo: {
      chatId: 'CID-1',
      chattingTime: '3m',
      startedAt: 'x',
      startedUrl: 'https://x.io',
      group: 'Sales'
    },
    preChatForm: {},
    technology: { ipAddress: '1.1.1.1', os: 'Mac', browser: 'Chrome', device: 'Desktop' },
    messages: [],
    ...over
  };
}

afterEach(() => cleanup());

describe('ArchivesList', () => {
  const chats = [
    chat({ id: 'chat-1', customerName: 'Tom', tags: ['lead'], snippet: 'Need API help' }),
    chat({
      id: 'chat-2',
      customerName: 'Zed',
      tags: ['botengine-transfer', 'other'],
      agent: 'Eve',
      snippet: 'Billing'
    }),
    chat({ id: 'chat-3', customerName: 'Amy', tags: [], date: 'Apr 9', snippet: 'Hello' })
  ];

  const names = () =>
    screen
      .getAllByRole('button')
      .filter((b) => (b.textContent ?? '').includes('Agent:'))
      .map((b) => b.querySelector('span')!.textContent);

  it('renders chats newest first with count and tag badges', () => {
    render(<ArchivesList chats={chats} selectedId='chat-2' onSelect={vi.fn()} totalCount={1234} />);
    expect(names()).toEqual(['Amy', 'Zed', 'Tom']);
    expect(screen.getByText(/1,234 chats/)).toBeInTheDocument();
    expect(screen.getByText('Agent: Eve')).toBeInTheDocument();
    expect(screen.getByText('other')).toBeInTheDocument();
  });

  it('sorts oldest first through the sort dropdown', () => {
    render(<ArchivesList chats={chats} selectedId='' onSelect={vi.fn()} totalCount={3} />);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Oldest' }));
    expect(names()).toEqual(['Tom', 'Zed', 'Amy']);
    expect(screen.getByLabelText('Sort chats')).toHaveTextContent('Oldest');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Newest' }));
    expect(names()).toEqual(['Amy', 'Zed', 'Tom']);
  });

  it('calls onSelect when a row is clicked', () => {
    const onSelect = vi.fn();
    render(<ArchivesList chats={chats} selectedId='' onSelect={onSelect} totalCount={3} />);
    fireEvent.click(screen.getByText('Tom'));
    expect(onSelect).toHaveBeenCalledWith('chat-1');
  });

  it('searches by name, snippet, agent, date and tag; clears search', () => {
    render(<ArchivesList chats={chats} selectedId='' onSelect={vi.fn()} totalCount={3} />);
    const input = screen.getByPlaceholderText('Search in archives...');
    for (const [q, expected] of [
      ['tom', ['Tom']],
      ['billing', ['Zed']],
      ['eve', ['Zed']],
      ['apr', ['Amy']],
      ['botengine', ['Zed']]
    ] as const) {
      fireEvent.change(input, { target: { value: q } });
      expect(names()).toEqual(expected);
    }
    fireEvent.change(input, { target: { value: 'nothing' } });
    expect(screen.getByText('No archived chats match your filter.')).toBeInTheDocument();
    fireEvent.click(input.parentElement!.querySelector('button')!);
    expect(input).toHaveValue('');
    expect(names()).toHaveLength(3);
  });

  it('filters by tag and clears the filter', () => {
    render(<ArchivesList chats={chats} selectedId='' onSelect={vi.fn()} totalCount={3} />);
    fireEvent.click(screen.getByRole('button', { name: 'lead' }));
    expect(names()).toEqual(['Tom']);
    expect(screen.getByText('Filter: lead')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'botengine-transfer' }));
    expect(names()).toEqual(['Zed']);
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(names()).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'lead' }));
    fireEvent.click(screen.getByRole('button', { name: 'All chats' }));
    expect(names()).toHaveLength(3);
    expect(screen.getByText('Add filter')).toBeInTheDocument();
  });
});

describe('ArchivesTranscript', () => {
  const messages: ArchivedChat['messages'] = [
    {
      id: 'm1',
      sender: 'visitor',
      author: 'Tom',
      timestamp: '10:00',
      type: 'pre-chat-form',
      formData: { name: 'Tom', email: 'tom@x.io' }
    },
    { id: 'm2', sender: 'visitor', author: 'Tom', text: 'Hi, need help', timestamp: '10:01' },
    { id: 'm3', sender: 'agent', author: 'Dan', text: 'Sure thing', timestamp: '10:02' },
    { id: 'm4', sender: 'system', author: 'sys', timestamp: '10:30', type: 'system-closed' },
    {
      id: 'm5',
      sender: 'system',
      author: 'sys',
      text: 'Custom close',
      timestamp: '10:31',
      type: 'system-closed'
    }
  ];

  const setup = (over: Partial<ArchivedChat> = {}) => {
    const props = {
      onNavigateChat: vi.fn(),
      onAddTag: vi.fn(),
      onRemoveTag: vi.fn()
    };
    render(<ArchivesTranscript chat={chat({ messages, ...over })} {...props} />);
    return props;
  };

  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn() },
      configurable: true
    });
  });

  it('renders every message variant', () => {
    setup();
    expect(screen.getByText('Tom and Dan')).toBeInTheDocument();
    expect(screen.getByText('Mar 1, 2022 10:00')).toBeInTheDocument();
    expect(screen.getByText('Pre-chat form')).toBeInTheDocument();
    expect(screen.getByText('tom@x.io')).toBeInTheDocument();
    expect(screen.getByText('Hi, need help')).toBeInTheDocument();
    expect(screen.getByText('Sure thing')).toBeInTheDocument();
    expect(screen.getByText(/Archived - closed by agent • 10:30/)).toBeInTheDocument();
    expect(screen.getByText('Custom close')).toBeInTheDocument();
  });

  it('falls back to "T" initials when the customer has none', () => {
    setup({ customer: { ...chat().customer, initials: '' } });
    expect(screen.getAllByText('T').length).toBeGreaterThan(0);
  });

  it('disables prev/next navigation when absent and navigates when present', () => {
    const p1 = setup();
    expect(screen.getByRole('button', { name: /Previous chat/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Next chat/ })).toBeDisabled();
    expect(p1.onNavigateChat).not.toHaveBeenCalled();
    cleanup();
    const p2 = setup({ previousChatId: 'p', nextChatId: 'n' });
    fireEvent.click(screen.getByRole('button', { name: /Previous chat/ }));
    fireEvent.click(screen.getByRole('button', { name: /Next chat/ }));
    expect(p2.onNavigateChat).toHaveBeenNthCalledWith(1, 'p');
    expect(p2.onNavigateChat).toHaveBeenNthCalledWith(2, 'n');
  });

  it('copies chat id and prints', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    setup();
    fireEvent.click(screen.getByRole('menuitem', { name: /Copy Chat ID/ }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('CID-1');
    fireEvent.click(screen.getByRole('menuitem', { name: /Print Transcript/ }));
    expect(print).toHaveBeenCalled();
  });

  it('lists tags, removes a tag, and shows empty message', () => {
    const p = setup({ tags: ['lead', 'vip'] });
    fireEvent.click(screen.getAllByTitle('Remove tag')[1]);
    expect(p.onRemoveTag).toHaveBeenCalledWith('chat-1', 'vip');
    cleanup();
    setup({ tags: [] });
    expect(screen.getByText('No tags assigned')).toBeInTheDocument();
  });

  it('adds a trimmed tag, ignoring blanks and duplicates, and closes the popover', () => {
    const p = setup({ tags: ['lead'] });
    fireEvent.click(screen.getByRole('button', { name: /Add tag/ }));
    const input = screen.getByPlaceholderText('e.g. priority, complaint');
    fireEvent.submit(input.closest('form')!);
    expect(p.onAddTag).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: ' lead ' } });
    fireEvent.submit(input.closest('form')!);
    expect(p.onAddTag).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: ' urgent ' } });
    fireEvent.submit(input.closest('form')!);
    expect(p.onAddTag).toHaveBeenCalledWith('chat-1', 'urgent');
    expect(screen.queryByPlaceholderText('e.g. priority, complaint')).toBeNull();
  });

  it('cancel closes the tag popover', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Add tag/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByPlaceholderText('e.g. priority, complaint')).toBeNull();
  });
});
