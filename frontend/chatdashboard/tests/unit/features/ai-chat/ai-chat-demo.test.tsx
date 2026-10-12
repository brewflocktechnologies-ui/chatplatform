import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

const h = vi.hoisted(() => ({
  chat: {
    messages: [] as any[],
    status: 'ready',
    sendMessage: vi.fn(),
    setMessages: vi.fn()
  },
  next: vi.fn(),
  get: vi.fn()
}));

vi.mock('@ai-sdk/react', () => ({ useChat: () => h.chat }));
vi.mock('@/features/ai-chat/chat', () => ({
  chatTransport: {},
  initialMessages: [],
  demoChat: { next: (m: unknown) => h.next(m), get: (n: number) => h.get(n) }
}));
vi.mock('@/components/ui/message-scroller', () => {
  const Pass = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    MessageScroller: Pass,
    MessageScrollerButton: () => null,
    MessageScrollerContent: Pass,
    MessageScrollerItem: Pass,
    MessageScrollerProvider: Pass,
    MessageScrollerViewport: Pass
  };
});

import { AiChatDemo } from '@/features/ai-chat/components/ai-chat-demo';

beforeEach(() => {
  h.chat.messages = [];
  h.chat.status = 'ready';
  h.chat.sendMessage.mockReset();
  h.chat.setMessages.mockReset();
  h.next.mockReset().mockReturnValue({ id: 'n1', role: 'user', parts: [] });
  h.get.mockReset().mockReturnValue(['restart']);
});
afterEach(() => cleanup());

describe('AiChatDemo', () => {
  it('shows the empty state and sends the next scripted message', () => {
    render(<AiChatDemo />);
    expect(screen.getByText('Release Assistant')).toBeInTheDocument();
    expect(screen.getByText(/to stream the/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /restart/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /send next message/i }));
    expect(h.chat.sendMessage).toHaveBeenCalledWith({ id: 'n1', role: 'user', parts: [] });
  });

  it('shows end of demo and disables send when no next message', () => {
    h.next.mockReturnValue(undefined);
    render(<AiChatDemo />);
    const btn = screen.getByRole('button', { name: /end of demo/i });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(h.chat.sendMessage).not.toHaveBeenCalled();
  });

  it('renders text, reasoning and tool parts for both roles, then restarts', () => {
    h.chat.messages = [
      { id: 'u', role: 'user', parts: [{ type: 'text', text: 'How is revenue?' }] },
      {
        id: 'a',
        role: 'assistant',
        parts: [
          { type: 'reasoning', text: 'thinking hard' },
          { type: 'text', text: 'Up 12%' },
          {
            type: 'tool-getRevenue',
            state: 'output-available',
            input: {},
            output: { revenue: 1250 }
          },
          { type: 'tool-getRevenue', state: 'input-streaming' },
          { type: 'dynamic-tool', toolName: 'custom', state: 'input-available' },
          { type: 'tool-bad', state: 'output-error', errorText: 'boom' },
          { type: 'tool-nullout', state: 'output-available', output: null },
          { type: 'source-url', url: 'x' }
        ]
      }
    ];
    render(<AiChatDemo />);
    expect(screen.getByText('How is revenue?')).toBeInTheDocument();
    expect(screen.getByText('thinking hard')).toBeInTheDocument();
    expect(screen.getByText('Up 12%')).toBeInTheDocument();
    expect(screen.getByText(/"revenue": 1250/)).toBeInTheDocument();
    expect(screen.getByText('Running getRevenue…')).toBeInTheDocument();
    expect(screen.getByText('Running custom…')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /restart/i }));
    expect(h.get).toHaveBeenCalledWith(0);
    expect(h.chat.setMessages).toHaveBeenCalledWith(['restart']);
  });

  it('shows thinking placeholder when submitted and disables controls when busy', () => {
    h.chat.messages = [{ id: 'u', role: 'user', parts: [{ type: 'text', text: 'hi' }] }];
    h.chat.status = 'submitted';
    render(<AiChatDemo />);
    expect(screen.getByText('Thinking…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /restart/i })).toBeDisabled();
    expect(screen.getByText('submitted')).toBeInTheDocument();
  });

  it('treats streaming as busy without the thinking placeholder', () => {
    h.chat.messages = [{ id: 'u', role: 'user', parts: [{ type: 'text', text: 'hi' }] }];
    h.chat.status = 'streaming';
    render(<AiChatDemo />);
    expect(screen.queryByText('Thinking…')).toBeNull();
    expect(screen.getByRole('button', { name: /restart/i })).toBeDisabled();
  });
});
