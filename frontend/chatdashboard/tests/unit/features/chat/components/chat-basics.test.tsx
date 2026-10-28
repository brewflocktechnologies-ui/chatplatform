import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

const { storeState, reduced } = vi.hoisted(() => ({
  storeState: { typingMap: {} as Record<string, boolean> },
  reduced: { value: false }
}));

vi.mock('@/features/chat/utils/store', () => ({
  useChatStore: (sel: (s: typeof storeState) => unknown) => sel(storeState)
}));
vi.mock('motion/react', async () => {
  const React = await import('react');
  const strip = (props: Record<string, unknown>) => {
    const { initial, animate, exit, transition, layout, whileHover, whileTap, ...rest } = props;
    void initial;
    void animate;
    void exit;
    void transition;
    void layout;
    void whileHover;
    void whileTap;
    return rest;
  };
  const make = (tag: string) =>
    React.forwardRef<HTMLElement, Record<string, unknown>>((props, ref) =>
      React.createElement(tag, { ...strip(props), ref })
    );
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useReducedMotion: () => reduced.value,
    motion: new Proxy({}, { get: (_t, tag: string) => make(tag) })
  };
});

import { ChatHeader } from '@/features/chat/components/chat-header';
import { ConversationSelect } from '@/features/chat/components/conversation-select';
import { MessageBubble } from '@/features/chat/components/message-bubble';
import { MessageComposer } from '@/features/chat/components/message-composer';
import { ChatArea } from '@/features/chat/components/chat-area';
import type { Conversation, Message } from '@/features/chat/utils/types';

function convo(over: Partial<Conversation> = {}): Conversation {
  return {
    id: 'c1',
    name: 'Alice',
    title: 'Support',
    status: 'online',
    unread: 0,
    initials: 'AL',
    messages: [],
    quickReplies: [],
    autoReplies: [],
    ...over
  };
}

beforeEach(() => {
  storeState.typingMap = {};
  reduced.value = false;
});
afterEach(() => cleanup());

describe('ChatHeader', () => {
  it('shows online badge and title when idle', () => {
    render(<ChatHeader conversation={convo()} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('online')).toBeInTheDocument();
    expect(screen.getByText('Support')).toBeInTheDocument();
    expect(screen.getByLabelText('Online')).toBeInTheDocument();
    expect(screen.queryByLabelText('Back to conversations')).toBeNull();
  });

  it('shows typing indicator instead of title/online badge', () => {
    storeState.typingMap = { c1: true };
    render(<ChatHeader conversation={convo()} />);
    expect(screen.getByText('typing...')).toBeInTheDocument();
    expect(screen.queryByText('Support')).toBeNull();
    expect(screen.queryByText('online')).toBeNull();
  });

  it('renders offline state and back button', () => {
    const onBack = vi.fn();
    render(<ChatHeader conversation={convo({ status: 'offline' })} onBack={onBack} />);
    expect(screen.getByLabelText('Offline')).toBeInTheDocument();
    expect(screen.queryByText('online')).toBeNull();
    fireEvent.click(screen.getByLabelText('Back to conversations'));
    expect(onBack).toHaveBeenCalled();
    expect(screen.getByLabelText('Start audio call')).toBeInTheDocument();
    expect(screen.getByLabelText('Start video call')).toBeInTheDocument();
    expect(screen.getByLabelText('More options')).toBeInTheDocument();
  });
});

describe('ConversationSelect', () => {
  const list = [
    convo({ id: 'a', name: 'Alice', unread: 2 }),
    convo({ id: 'b', name: 'Bob', status: 'offline' })
  ];

  it('lists conversations, counts and notifies on change', () => {
    const onSelect = vi.fn();
    render(<ConversationSelect conversations={list} selectedId='a' onSelect={onSelect} />);
    expect(screen.getByText(/2 conversations/)).toBeInTheDocument();
    expect(screen.getByText(/1 online/)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Alice \(2 unread\)/ })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Active User Chat'), { target: { value: 'b' } });
    expect(onSelect).toHaveBeenCalledWith('b');
  });

  it('uses singular label for a single conversation', () => {
    render(<ConversationSelect conversations={[list[1]]} selectedId='b' onSelect={vi.fn()} />);
    expect(screen.getByText(/1 conversation •/)).toBeInTheDocument();
  });
});

describe('MessageBubble', () => {
  const base: Message = {
    id: 'm',
    sender: 'contact',
    author: 'Alice',
    text: 'Hello',
    timestamp: '10:00'
  };

  it('renders contact message with author', () => {
    render(<MessageBubble message={base} />);
    expect(screen.getByRole('group', { name: 'Alice at 10:00' })).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('renders agent message with attachments and no author', () => {
    reduced.value = true;
    render(
      <MessageBubble
        message={{
          ...base,
          sender: 'user',
          author: 'Me',
          attachments: [{ id: 'f1', name: 'doc.pdf', size: 1, type: 'application/pdf' }]
        }}
      />
    );
    expect(screen.queryByText('Me')).toBeNull();
    expect(screen.getByText('doc.pdf')).toBeInTheDocument();
  });

  it('renders contact message attachments with the default preview variant', () => {
    reduced.value = true;
    render(
      <MessageBubble
        message={{
          ...base,
          attachments: [{ id: 'f2', name: 'receipt.pdf', size: 1, type: 'application/pdf' }]
        }}
      />
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('receipt.pdf')).toBeInTheDocument();
  });

  it('skips empty text and empty attachments', () => {
    render(<MessageBubble message={{ ...base, text: '', attachments: [] }} />);
    expect(screen.queryByText('Hello')).toBeNull();
    expect(screen.getByText('10:00')).toBeInTheDocument();
  });
});

describe('MessageComposer', () => {
  const props = () => ({
    draft: '',
    onDraftChange: vi.fn(),
    onSubmit: vi.fn((e: React.FormEvent) => e.preventDefault()),
    contactName: 'Alice',
    quickReplies: [] as string[],
    attachments: [] as { id: string; name: string; size: number; type: string }[],
    onAddAttachments: vi.fn(),
    onRemoveAttachment: vi.fn()
  });

  it('disables send when empty and hides quick replies/attachments', () => {
    render(<MessageComposer {...props()} />);
    expect(screen.getByLabelText('Send message')).toBeDisabled();
    expect(screen.queryByText('Suggested:')).toBeNull();
    expect(screen.getByPlaceholderText('Message Alice...')).toBeRequired();
  });

  it('emits draft changes and quick replies', () => {
    const p = { ...props(), quickReplies: ['Thanks!'] };
    render(<MessageComposer {...p} />);
    fireEvent.change(screen.getByLabelText('Message Alice'), { target: { value: 'hi' } });
    expect(p.onDraftChange).toHaveBeenCalledWith('hi');
    fireEvent.click(screen.getByText('Thanks!'));
    expect(p.onDraftChange).toHaveBeenCalledWith('Thanks!');
  });

  it('Enter submits when there is content, Shift+Enter does not', () => {
    const p = { ...props(), draft: 'hello' };
    render(<MessageComposer {...p} />);
    const ta = screen.getByLabelText('Message Alice');
    fireEvent.keyDown(ta, { key: 'Enter', shiftKey: true });
    expect(p.onSubmit).not.toHaveBeenCalled();
    HTMLFormElement.prototype.requestSubmit = function () {
      this.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    };
    fireEvent.keyDown(ta, { key: 'Enter' });
    expect(p.onSubmit).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(ta, { key: 'a' });
    expect(p.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('Enter with empty draft and no attachments does not submit', () => {
    const p = props();
    render(<MessageComposer {...p} />);
    fireEvent.keyDown(screen.getByLabelText('Message Alice'), { key: 'Enter' });
    expect(p.onSubmit).not.toHaveBeenCalled();
  });

  it('shows attachments, enables send, and handles file input', () => {
    const p = {
      ...props(),
      attachments: [{ id: 'f1', name: 'pic.png', size: 3, type: 'image/png' }]
    };
    const { container } = render(<MessageComposer {...p} />);
    expect(screen.getByText('pic.png')).toBeInTheDocument();
    expect(screen.getByLabelText('Send message')).toBeEnabled();
    expect(screen.getByLabelText('Message Alice')).not.toBeRequired();

    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {});
    fireEvent.click(screen.getByLabelText('Attach a file'));
    expect(clickSpy).toHaveBeenCalled();

    const file = new File(['x'], 'a.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(p.onAddAttachments).toHaveBeenCalledTimes(1);

    fireEvent.change(input, { target: { files: [] } });
    expect(p.onAddAttachments).toHaveBeenCalledTimes(1);
  });
});

describe('ChatArea', () => {
  const messages: Message[] = [
    { id: '1', sender: 'contact', author: 'Alice', text: 'Hi there', timestamp: '09:00' },
    { id: '2', sender: 'user', author: 'Me', text: 'Hello', timestamp: '09:01' }
  ];
  const baseProps = () => ({
    draft: '',
    onDraftChange: vi.fn(),
    onSubmit: vi.fn(),
    attachments: [],
    onAddAttachments: vi.fn(),
    onRemoveAttachment: vi.fn()
  });

  it('renders messages, announces last message and scrolls (smooth)', () => {
    const scrollTo = vi.fn();
    Element.prototype.scrollTo = scrollTo as unknown as typeof Element.prototype.scrollTo;
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    const { container } = render(<ChatArea conversation={convo({ messages })} {...baseProps()} />);
    expect(screen.getByLabelText('Message thread with Alice')).toBeInTheDocument();
    expect(screen.getByText('Hi there')).toBeInTheDocument();
    expect(container.querySelector('[aria-live=polite]')!.textContent).toBe('Me at 09:01: Hello');
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
    raf.mockRestore();
  });

  it('scrolls with auto behavior when reduced motion, and handles no messages', () => {
    reduced.value = true;
    const scrollTo = vi.fn();
    Element.prototype.scrollTo = scrollTo as unknown as typeof Element.prototype.scrollTo;
    const { container } = render(<ChatArea conversation={convo()} {...baseProps()} />);
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'auto' }));
    expect(container.querySelector('[aria-live=polite]')!.textContent).toBe('');
  });
});
