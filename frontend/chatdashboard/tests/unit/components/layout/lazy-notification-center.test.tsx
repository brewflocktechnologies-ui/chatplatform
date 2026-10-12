import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// next/dynamic -> expose the loader and the loading fallback so both can be
// exercised without a real async chunk.
const captured = vi.hoisted(() => ({
  loader: null as null | (() => Promise<unknown>),
  loading: null as any
}));

vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<unknown>, opts: { loading: () => React.ReactNode }) => {
    captured.loader = loader;
    captured.loading = opts.loading;
    return function Dynamic() {
      return <div data-testid='dynamic'>{opts.loading()}</div>;
    };
  }
}));

vi.mock('@/features/notifications/components/notification-center', () => ({
  NotificationCenter: () => <div data-testid='real-center' />
}));

import { LazyNotificationCenter } from '@/components/layout/lazy-notification-center';

describe('LazyNotificationCenter', () => {
  it('renders the fallback trigger while the chunk loads', () => {
    render(<LazyNotificationCenter />);
    expect(screen.getByTestId('dynamic')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toHaveClass('sr-only');
  });

  it('resolves the real NotificationCenter component from the chunk', async () => {
    const Component = (await captured.loader!()) as React.ComponentType;
    render(<Component />);
    expect(screen.getByTestId('real-center')).toBeInTheDocument();
  });
});
