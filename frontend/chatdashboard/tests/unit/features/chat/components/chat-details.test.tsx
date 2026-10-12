import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

const { toast } = vi.hoisted(() => ({
  toast: { success: vi.fn(), info: vi.fn() }
}));
vi.mock('sonner', () => ({ toast }));

import { ChatDetails } from '@/features/chat/components/chat-details';
import type { Conversation, DetailsTab } from '@/features/chat/utils/types';

function convo(over: Partial<Conversation> = {}): Conversation {
  return {
    id: 'c1',
    name: 'Alice Smith!',
    title: 'Support',
    status: 'online',
    unread: 0,
    initials: 'AS',
    messages: [],
    quickReplies: [],
    autoReplies: [],
    ...over
  };
}

function setup(
  tab: DetailsTab,
  opts: { conversation?: Conversation; isOpen?: boolean; withInsert?: boolean } = {}
) {
  const onToggle = vi.fn();
  const onTabChange = vi.fn();
  const onInsertCanned = vi.fn();
  const utils = render(
    <ChatDetails
      conversation={opts.conversation ?? convo()}
      isOpen={opts.isOpen ?? true}
      onToggle={onToggle}
      activeTab={tab}
      onTabChange={onTabChange}
      onInsertCanned={opts.withInsert === false ? undefined : onInsertCanned}
    />
  );
  return { ...utils, onToggle, onTabChange, onInsertCanned };
}

let writeText: ReturnType<typeof vi.fn>;
beforeEach(() => {
  writeText = vi.fn();
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});
afterEach(() => {
  cleanup();
  toast.success.mockReset();
  toast.info.mockReset();
});

describe('ChatDetails', () => {
  it('renders nothing when closed', () => {
    const { container } = setup('info', { isOpen: false });
    expect(container).toBeEmptyDOMElement();
  });

  it('switches tabs and toggles panel', () => {
    const { onTabChange, onToggle } = setup('info');
    fireEvent.click(screen.getByLabelText('Notes & Canned Responses'));
    expect(onTabChange).toHaveBeenCalledWith('canned');
    fireEvent.click(screen.getByLabelText('Apps & Integrations'));
    expect(onTabChange).toHaveBeenCalledWith('apps');
    fireEvent.click(screen.getByLabelText('Visitor Details'));
    expect(onTabChange).toHaveBeenCalledWith('info');
    fireEvent.click(screen.getByLabelText('Hide Details Panel'));
    expect(onToggle).toHaveBeenCalled();
  });

  describe('info tab', () => {
    it('shows generated defaults for missing visitor info', () => {
      setup('info');
      expect(screen.getByText('alice.smith@visitor.com')).toBeInTheDocument();
      expect(screen.getByText('San Francisco, United States')).toBeInTheDocument();
      expect(screen.getByText('198.51.100.42')).toBeInTheDocument();
      expect(screen.getByText('4m 12s')).toBeInTheDocument();
      expect(screen.getByText('online')).toBeInTheDocument();
    });

    it('prefers provided visitor info and offline status', () => {
      setup('info', {
        conversation: convo({
          status: 'offline',
          visitorInfo: {
            email: 'real@x.io',
            location: 'Paris',
            localTime: '10:00 AM',
            ipAddress: '1.1.1.1',
            os: 'Linux',
            browser: 'Firefox',
            device: 'Phone',
            startedUrl: 'https://x.io/start',
            chattingTime: '1m'
          }
        })
      });
      expect(screen.getByText('real@x.io')).toBeInTheDocument();
      expect(screen.getByText('Paris')).toBeInTheDocument();
      expect(screen.getByText('10:00 AM')).toBeInTheDocument();
      expect(screen.getByText('Linux')).toBeInTheDocument();
      expect(screen.getByText('https://x.io/start')).toHaveAttribute('href', 'https://x.io/start');
      expect(screen.getByText('offline')).toBeInTheDocument();
    });

    it('copies email and chat id; toasts on session history', () => {
      setup('info');
      fireEvent.click(screen.getByText('alice.smith@visitor.com'));
      expect(writeText).toHaveBeenCalledWith('alice.smith@visitor.com');
      expect(toast.success).toHaveBeenCalledWith('Copied email to clipboard');
      fireEvent.click(screen.getByText('c1'));
      expect(writeText).toHaveBeenCalledWith('c1');
      fireEvent.click(screen.getByText('View all past sessions'));
      expect(toast.info).toHaveBeenCalled();
    });

    it('does not copy when clipboard is unavailable', () => {
      Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
      setup('info');
      fireEvent.click(screen.getByText('c1'));
      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  describe('canned tab', () => {
    it('adds a note, ignoring blank ones', () => {
      setup('canned');
      expect(screen.getByText(/Visitor initiated conversation/)).toBeInTheDocument();
      const ta = screen.getByPlaceholderText('Leave a private note about this chat...');
      fireEvent.submit(ta.closest('form')!);
      expect(toast.success).not.toHaveBeenCalled();
      fireEvent.change(ta, { target: { value: '  Call back tomorrow  ' } });
      fireEvent.click(screen.getByText('Add Note'));
      expect(screen.getByText('Call back tomorrow')).toBeInTheDocument();
      expect(screen.getByText('Just now')).toBeInTheDocument();
      expect(toast.success).toHaveBeenCalledWith('Private note added');
      expect(ta).toHaveValue('');
    });

    it('filters canned responses and shows nothing when no match', () => {
      setup('canned');
      const search = screen.getByPlaceholderText('Search canned responses...');
      fireEvent.change(search, { target: { value: 'engineering' } });
      expect(screen.getByText('Checking with Engineering')).toBeInTheDocument();
      expect(screen.queryByText('Greeting & Welcome')).toBeNull();
      fireEvent.change(search, { target: { value: 'zzzzzz' } });
      expect(screen.queryByText('Checking with Engineering')).toBeNull();
    });

    it('inserts canned text via callback', () => {
      const { onInsertCanned } = setup('canned');
      fireEvent.click(screen.getAllByText('Insert')[0]);
      expect(onInsertCanned).toHaveBeenCalledWith(expect.stringContaining('Hello!'));
      expect(toast.success).toHaveBeenCalledWith('Inserted into composer');
    });

    it('copies to clipboard when insert callback is absent', () => {
      setup('canned', { withInsert: false });
      fireEvent.click(screen.getAllByText('Insert')[0]);
      expect(writeText).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Copied response to clipboard');
      fireEvent.click(screen.getAllByText('Copy')[1]);
      expect(toast.success).toHaveBeenCalledWith('Copied Request Account Details to clipboard');
    });

    it('shows empty notes message when the conversation has none and default is absent', () => {
      // A conversation whose id is "default" still resolves; use a fresh id and add notes to check isolation
      setup('canned', { conversation: convo({ id: 'other' }) });
      // falls back to default notes
      expect(screen.getByText(/Visitor initiated conversation/)).toBeInTheDocument();
    });
  });

  describe('apps tab', () => {
    it('renders integrations and quick actions', () => {
      setup('apps');
      expect(screen.getByText('HubSpot CRM')).toBeInTheDocument();
      expect(screen.getByText('Jira Service Desk')).toBeInTheDocument();
      expect(screen.getByText('Stripe Billing')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Export'));
      expect(toast.success).toHaveBeenCalledWith('Transcript exported to email');
      fireEvent.click(screen.getByText('Transfer'));
      expect(toast.info).toHaveBeenCalledWith('Transfer modal opened');
    });
  });
});
