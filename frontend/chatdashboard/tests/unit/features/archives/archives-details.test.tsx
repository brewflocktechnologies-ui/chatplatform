import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

const { toast } = vi.hoisted(() => ({ toast: { success: vi.fn() } }));
vi.mock('sonner', () => ({ toast }));

import { ArchivesDetails, type DetailsTab } from '@/features/archives/components/archives-details';
import type { ArchivedChat } from '@/features/archives/types';

function chat(over: Partial<ArchivedChat> = {}): ArchivedChat {
  return {
    id: 'chat-1',
    customerName: 'Tom',
    date: 'Mar 1',
    timestamp: 'Mar 1, 2022 10:00',
    agent: 'Dan',
    snippet: 's',
    messageCount: 4,
    tags: [],
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
      startedUrl: 'https://x.io/start',
      group: 'Sales'
    },
    preChatForm: { name: 'Tom P', email: 'form@x.io' },
    technology: { ipAddress: '1.1.1.1', os: 'Mac', browser: 'Chrome', device: 'Desktop' },
    messages: [],
    ...over
  };
}

function setup(tab: DetailsTab, c: ArchivedChat = chat(), isOpen = true) {
  const onToggle = vi.fn();
  const onTabChange = vi.fn();
  const utils = render(
    <ArchivesDetails
      chat={c}
      isOpen={isOpen}
      onToggle={onToggle}
      activeTab={tab}
      onTabChange={onTabChange}
    />
  );
  return { ...utils, onToggle, onTabChange };
}

let writeText: ReturnType<typeof vi.fn>;
beforeEach(() => {
  writeText = vi.fn();
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});
afterEach(() => {
  cleanup();
  toast.success.mockReset();
});

describe('ArchivesDetails', () => {
  it('renders nothing when closed', () => {
    const { container } = setup('info', chat(), false);
    expect(container).toBeEmptyDOMElement();
  });

  it('switches tabs and hides the panel', () => {
    const { onTabChange, onToggle } = setup('info');
    fireEvent.click(screen.getByLabelText('Notes & Canned Responses'));
    fireEvent.click(screen.getByLabelText('Apps & Integrations'));
    fireEvent.click(screen.getByLabelText('Customer Details'));
    expect(onTabChange.mock.calls.map((c) => c[0])).toEqual(['canned', 'apps', 'info']);
    fireEvent.click(screen.getByLabelText('Hide Details Panel'));
    expect(onToggle).toHaveBeenCalled();
  });

  it('info tab shows customer data and copies values', () => {
    setup('info');
    expect(screen.getByText('View all chats (2)')).toBeInTheDocument();
    expect(screen.getByText('Berlin')).toBeInTheDocument();
    expect(screen.getByText('Tom P')).toBeInTheDocument();
    expect(screen.getByText('form@x.io')).toBeInTheDocument();
    expect(screen.getByText('1.1.1.1')).toBeInTheDocument();
    expect(screen.getByText('https://x.io/start')).toHaveAttribute('href', 'https://x.io/start');
    fireEvent.click(screen.getByText('tom@x.io'));
    expect(writeText).toHaveBeenCalledWith('tom@x.io');
    expect(toast.success).toHaveBeenCalledWith('Copied email to clipboard');
    fireEvent.click(screen.getByText('CID-1'));
    expect(writeText).toHaveBeenCalledWith('CID-1');
  });

  it('info tab handles missing initials and pre-chat fields', () => {
    setup('info', chat({ customer: { ...chat().customer, initials: '' }, preChatForm: {} }));
    expect(screen.getByText('T')).toBeInTheDocument();
    expect(screen.queryByText('Name:')).toBeNull();
    expect(screen.queryByText('E-mail:')).toBeNull();
  });

  it('canned tab shows default notes for chat-5, adds notes and filters canned replies', () => {
    setup('canned', chat({ id: 'chat-5' }));
    expect(screen.getByText(/API integration/)).toBeInTheDocument();
    const ta = screen.getByPlaceholderText('Leave a private note about this chat or customer...');
    fireEvent.submit(ta.closest('form')!);
    expect(toast.success).not.toHaveBeenCalled();
    fireEvent.change(ta, { target: { value: ' follow up ' } });
    fireEvent.click(screen.getByText('Add Note'));
    expect(screen.getByText('follow up')).toBeInTheDocument();
    expect(screen.getByText('Just now')).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith('Note added successfully');

    const search = screen.getByPlaceholderText('Search canned responses...');
    fireEvent.change(search, { target: { value: 'lead follow' } });
    expect(screen.getByText('Lead Follow-up')).toBeInTheDocument();
    expect(screen.queryByText('Chat Wrap-up')).toBeNull();
    fireEvent.click(screen.getByText('Copy'));
    expect(toast.success).toHaveBeenCalledWith('Copied Lead Follow-up to clipboard');
  });

  it('canned tab shows empty-notes message and falls back to Agent author', () => {
    setup('canned', chat({ id: 'chat-9', agent: '' }));
    expect(screen.getByText('No notes recorded yet.')).toBeInTheDocument();
    fireEvent.change(
      screen.getByPlaceholderText('Leave a private note about this chat or customer...'),
      {
        target: { value: 'x' }
      }
    );
    fireEvent.click(screen.getByText('Add Note'));
    expect(screen.getByText('Agent')).toBeInTheDocument();
  });

  it('apps tab shows integration cards', () => {
    setup('apps');
    expect(screen.getByText('HubSpot CRM')).toBeInTheDocument();
    expect(screen.getByText('Dan')).toBeInTheDocument();
    expect(screen.getByText('Jira Software')).toBeInTheDocument();
    expect(screen.getByText('Stripe Billing')).toBeInTheDocument();
  });
});
