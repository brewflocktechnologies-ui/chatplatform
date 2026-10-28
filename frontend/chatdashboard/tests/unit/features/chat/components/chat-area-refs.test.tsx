import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import React from 'react';

// Every ref stays null so the effects' "element not mounted yet" guards run.
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useRef: () => ({
      get current() {
        return null;
      },
      set current(_value: unknown) {}
    })
  };
});
vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
  motion: new Proxy(
    {},
    { get: () => (props: { children?: React.ReactNode }) => <div>{props.children}</div> }
  )
}));
vi.mock('@/features/chat/components/chat-header', () => ({ ChatHeader: () => null }));
vi.mock('@/features/chat/components/message-composer', () => ({ MessageComposer: () => null }));
vi.mock('@/features/chat/components/message-bubble', () => ({ MessageBubble: () => null }));

import { ChatArea } from '@/features/chat/components/chat-area';

afterEach(cleanup);

describe('ChatArea before refs are attached', () => {
  it('skips scrolling and the live-region announcement', () => {
    const scrollTo = vi.fn();
    Element.prototype.scrollTo = scrollTo as unknown as typeof Element.prototype.scrollTo;
    const { container } = render(
      <ChatArea
        conversation={{
          id: 'c1',
          name: 'Alice',
          title: 'Support',
          status: 'online',
          unread: 0,
          initials: 'AL',
          messages: [
            { id: '1', sender: 'contact', author: 'Alice', text: 'Hi', timestamp: '09:00' }
          ],
          quickReplies: [],
          autoReplies: []
        }}
        draft=''
        onDraftChange={vi.fn()}
        onSubmit={vi.fn()}
        attachments={[]}
        onAddAttachments={vi.fn()}
        onRemoveAttachment={vi.fn()}
      />
    );
    expect(scrollTo).not.toHaveBeenCalled();
    expect(container.querySelector('[aria-live=polite]')!.textContent).toBe('');
  });
});
