import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('@/features/chat/components/messenger', () => ({
  Messenger: () => <div data-testid='messenger' />
}));

import ChatViewPage from '@/features/chat/components/chat-view-page';

describe('ChatViewPage', () => {
  it('renders the messenger', () => {
    render(<ChatViewPage />);
    expect(screen.getByTestId('messenger')).toBeInTheDocument();
  });
});
