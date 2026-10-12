import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

const h = vi.hoisted(() => {
  const actions = {
    initSocket: vi.fn(),
    selectConversation: vi.fn(),
    setDraft: vi.fn(),
    sendMessage: vi.fn(),
    sendTypingStatus: vi.fn(),
    addIncomingMessage: vi.fn(),
    advanceReplyCursor: vi.fn(),
    getActiveConversation: vi.fn()
  };
  return {
    actions,
    state: {
      conversations: [] as unknown[],
      selectedConversationId: 'c1',
      draft: '',
      replyCursor: {} as Record<string, number>,
      socketStatus: 'disconnected'
    },
    socket: { isConnected: false },
    reduced: { value: false },
    props: {} as Record<string, any>
  };
});

vi.mock('@/features/chat/utils/store', () => ({
  useChatStore: (sel?: (s: unknown) => unknown) => {
    const all = { ...h.state, ...h.actions };
    return sel ? sel(all) : all;
  }
}));
vi.mock('@/features/chat/services/chat-socket-client', () => ({
  chatDashboardSocket: h.socket
}));
vi.mock('motion/react', () => ({ useReducedMotion: () => h.reduced.value }));
vi.mock('@/features/chat/components/conversation-list', () => ({
  ConversationList: (p: any) => {
    h.props.list = p;
    return (
      <button type='button' onClick={() => p.onSelect('c2')}>
        list-select
      </button>
    );
  }
}));
vi.mock('@/features/chat/components/chat-area', () => ({
  ChatArea: (p: any) => {
    h.props.area = p;
    return (
      <div data-testid='area'>
        <button type='button' onClick={() => p.onDraftChange('abc')}>
          draft
        </button>
        <button type='button' onClick={p.onToggleDetails}>
          toggle
        </button>
        <button type='button' onClick={p.onBack}>
          back
        </button>
        <button
          type='button'
          onClick={() =>
            p.onAddAttachments([
              { name: 'a.txt', size: 1, type: 'text/plain' },
              { name: 'b.txt', size: 2, type: 'text/plain' }
            ])
          }
        >
          add-files
        </button>
        <span data-testid='att'>{p.attachments.map((a: any) => a.name).join(',')}</span>
        <button type='button' onClick={() => p.onRemoveAttachment(p.attachments[0]?.id)}>
          rm-file
        </button>
        <form data-testid='form' onSubmit={(e) => p.onSubmit(e)} />
      </div>
    );
  }
}));
vi.mock('@/features/chat/components/chat-details', () => ({
  ChatDetails: (p: any) => {
    h.props.details = p;
    return (
      <div data-testid='details'>
        <button type='button' onClick={p.onToggle}>
          close-details
        </button>
        <button type='button' onClick={() => p.onInsertCanned('canned')}>
          insert
        </button>
      </div>
    );
  }
}));

import { Messenger } from '@/features/chat/components/messenger';

const active = {
  id: 'c1',
  name: 'Alice',
  autoReplies: ['r1', 'r2']
};

function submit() {
  fireEvent.submit(screen.getByTestId('form'));
}

beforeEach(() => {
  vi.useFakeTimers();
  Object.values(h.actions).forEach((f) => f.mockReset());
  h.actions.getActiveConversation.mockReturnValue(active);
  h.state.draft = 'hello';
  h.state.replyCursor = {};
  h.state.socketStatus = 'disconnected';
  h.socket.isConnected = false;
  h.reduced.value = false;
  delete process.env.NEXT_PUBLIC_CHAT_WS_URL;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Messenger', () => {
  it('initialises the socket with default or env url', () => {
    render(<Messenger />);
    expect(h.actions.initSocket).toHaveBeenCalledWith('ws://localhost:8088', 'demo-tenant');
    cleanup();
    process.env.NEXT_PUBLIC_CHAT_WS_URL = 'ws://example';
    render(<Messenger />);
    expect(h.actions.initSocket).toHaveBeenLastCalledWith('ws://example', 'demo-tenant');
  });

  it('selecting a conversation clears attachments', () => {
    render(<Messenger />);
    fireEvent.click(screen.getByText('add-files'));
    expect(screen.getByTestId('att').textContent).toBe('a.txt,b.txt');
    fireEvent.click(screen.getByText('list-select'));
    expect(h.actions.selectConversation).toHaveBeenCalledWith('c2');
    expect(screen.getByTestId('att').textContent).toBe('');
  });

  it('removes a single attachment', () => {
    render(<Messenger />);
    fireEvent.click(screen.getByText('add-files'));
    fireEvent.click(screen.getByText('rm-file'));
    expect(screen.getByTestId('att').textContent).toBe('b.txt');
  });

  it('draft change does not send typing status when disconnected', () => {
    render(<Messenger />);
    fireEvent.click(screen.getByText('draft'));
    expect(h.actions.setDraft).toHaveBeenCalledWith('abc');
    expect(h.actions.sendTypingStatus).not.toHaveBeenCalled();
  });

  it('draft change sends typing status and debounces stop when connected', () => {
    h.socket.isConnected = true;
    render(<Messenger />);
    fireEvent.click(screen.getByText('draft'));
    fireEvent.click(screen.getByText('draft'));
    expect(h.actions.sendTypingStatus).toHaveBeenCalledTimes(2);
    expect(h.actions.sendTypingStatus).toHaveBeenLastCalledWith(true);
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(h.actions.sendTypingStatus).toHaveBeenCalledTimes(3);
    expect(h.actions.sendTypingStatus).toHaveBeenLastCalledWith(false);
  });

  it('clears pending timers on unmount', () => {
    h.socket.isConnected = true;
    const { unmount } = render(<Messenger />);
    fireEvent.click(screen.getByText('draft'));
    submit();
    unmount();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(h.actions.sendTypingStatus).not.toHaveBeenCalledWith(false);
  });

  it('submit ignores empty drafts and missing active conversation', () => {
    h.state.draft = '   ';
    render(<Messenger />);
    submit();
    expect(h.actions.sendMessage).not.toHaveBeenCalled();
    cleanup();
    h.state.draft = 'hi';
    h.actions.getActiveConversation.mockReturnValue(undefined);
    render(<Messenger />);
    expect(screen.queryByTestId('area')).toBeNull();
  });

  it('submit sends message and simulates auto reply when offline', () => {
    h.state.replyCursor = { c1: 3 };
    render(<Messenger />);
    submit();
    expect(h.actions.sendMessage).toHaveBeenCalledWith('hello', undefined);
    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(h.actions.addIncomingMessage).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ sender: 'contact', author: 'Alice', text: 'r2' })
    );
    expect(h.actions.advanceReplyCursor).toHaveBeenCalledWith('c1');
  });

  it('replies immediately under reduced motion and sends attachments', () => {
    h.reduced.value = true;
    render(<Messenger />);
    fireEvent.click(screen.getByText('add-files'));
    submit();
    expect(h.actions.sendMessage).toHaveBeenCalledWith(
      'hello',
      expect.arrayContaining([expect.objectContaining({ name: 'a.txt' })])
    );
    expect(screen.getByTestId('att').textContent).toBe('');
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(h.actions.addIncomingMessage).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ text: 'r1' })
    );
  });

  it('does not auto reply when connected or when there are no auto replies', () => {
    h.socket.isConnected = true;
    render(<Messenger />);
    submit();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(h.actions.sendMessage).toHaveBeenCalled();
    expect(h.actions.addIncomingMessage).not.toHaveBeenCalled();
    cleanup();
    h.socket.isConnected = false;
    h.actions.getActiveConversation.mockReturnValue({ ...active, autoReplies: [] });
    render(<Messenger />);
    submit();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(h.actions.addIncomingMessage).not.toHaveBeenCalled();
  });

  it('back button deselects the conversation', () => {
    render(<Messenger />);
    fireEvent.click(screen.getByText('back'));
    expect(h.actions.selectConversation).toHaveBeenCalledWith('');
  });

  it('collapses and reopens the details panel via rail buttons', () => {
    render(<Messenger />);
    expect(screen.getByTestId('details')).toBeInTheDocument();
    fireEvent.click(screen.getByText('close-details'));
    expect(screen.queryByTestId('details')).toBeNull();
    fireEvent.click(screen.getByLabelText('Open Details Panel'));
    expect(screen.getByTestId('details')).toBeInTheDocument();

    fireEvent.click(screen.getByText('toggle'));
    expect(screen.queryByTestId('details')).toBeNull();
    fireEvent.click(screen.getByLabelText('Apps & Integrations'));
    expect(h.props.details.activeTab).toBe('apps');

    fireEvent.click(screen.getByText('toggle'));
    fireEvent.click(screen.getByLabelText('Notes & Canned Responses'));
    expect(h.props.details.activeTab).toBe('canned');

    fireEvent.click(screen.getByText('toggle'));
    fireEvent.click(screen.getByLabelText('Visitor Details'));
    expect(h.props.details.activeTab).toBe('info');
  });

  it('insert canned routes through draft change', () => {
    render(<Messenger />);
    fireEvent.click(screen.getByText('insert'));
    expect(h.actions.setDraft).toHaveBeenCalledWith('canned');
  });

  it('shows empty state with connection status when no active conversation', () => {
    h.actions.getActiveConversation.mockReturnValue(undefined);
    h.state.socketStatus = 'connected';
    const { unmount } = render(<Messenger />);
    expect(screen.getByText('Live Chat Platform')).toBeInTheDocument();
    expect(screen.getByText(/Connected & Listening/)).toBeInTheDocument();
    unmount();
    h.state.socketStatus = 'connecting';
    render(<Messenger />);
    expect(screen.getByText(/WebSocket: connecting/)).toBeInTheDocument();
  });
});
