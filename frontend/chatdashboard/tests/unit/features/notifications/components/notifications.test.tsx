import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

const h = vi.hoisted(() => ({
  push: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  notifications: [] as any[]
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: h.push }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}));
vi.mock('@/features/notifications/utils/store', () => ({
  useNotificationStore: () => ({
    notifications: h.notifications,
    markAsRead: h.markAsRead,
    markAllAsRead: h.markAllAsRead,
    unreadCount: () => h.notifications.filter((n) => n.status === 'unread').length
  })
}));
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ render, children }: any) => React.cloneElement(render, {}, children),
  PopoverContent: ({ children }: any) => <div>{children}</div>
}));
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>
}));
vi.mock('@/components/layout/page-container', () => ({
  default: ({ pageTitle, pageDescription, pageHeaderAction, children }: any) => (
    <div>
      <h1>{pageTitle}</h1>
      <p>{pageDescription}</p>
      {pageHeaderAction}
      {children}
    </div>
  )
}));
vi.mock('@/components/ui/notification-card', () => ({
  NotificationCard: (p: any) => (
    <div data-testid='card'>
      <span>{p.title}</span>
      <button type='button' onClick={() => p.onMarkAsRead(p.id)}>
        read-{p.id}
      </button>
      {['view', 'view-product', 'billing', 'open', 'open-chat', 'unknown'].map((a) => (
        <button key={a} type='button' onClick={() => p.onAction(p.id, a)}>
          act-{a}-{p.id}
        </button>
      ))}
    </div>
  )
}));

import { NotificationCenter } from '@/features/notifications/components/notification-center';
import NotificationsPage from '@/features/notifications/components/notifications-page';

const mk = (id: number, status: 'unread' | 'read') => ({
  id: String(id),
  title: `Title ${id}`,
  body: 'b',
  status,
  createdAt: new Date().toISOString()
});

const routes: Record<string, string> = {
  view: '/dashboard/workspaces',
  'view-product': '/dashboard/product',
  billing: '/dashboard/billing',
  open: '/dashboard/overview',
  'open-chat': '/dashboard/chat'
};

beforeEach(() => {
  h.push.mockReset();
  h.markAsRead.mockReset();
  h.markAllAsRead.mockReset();
  h.notifications = [];
});
afterEach(() => cleanup());

describe('NotificationCenter', () => {
  it('shows the empty state without badges', () => {
    render(<NotificationCenter />);
    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    expect(screen.queryByText('Mark all as read')).toBeNull();
    expect(screen.queryByText(/ new$/)).toBeNull();
    expect(screen.getByText('Notifications', { selector: 'h4' })).toBeInTheDocument();
  });

  it('caps visible notifications at five and shows unread count + mark all', () => {
    h.notifications = Array.from({ length: 7 }, (_, i) => mk(i + 1, 'unread'));
    render(<NotificationCenter />);
    expect(screen.getAllByTestId('card')).toHaveLength(5);
    expect(screen.getByText('7 new')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Mark all as read'));
    expect(h.markAllAsRead).toHaveBeenCalled();
  });

  it('shows 9+ for large unread counts', () => {
    h.notifications = Array.from({ length: 12 }, (_, i) => mk(i + 1, 'unread'));
    render(<NotificationCenter />);
    expect(screen.getByText('9+')).toBeInTheDocument();
  });

  it('marks as read and routes known actions only', () => {
    h.notifications = [mk(1, 'unread')];
    render(<NotificationCenter />);
    fireEvent.click(screen.getByText('read-1'));
    expect(h.markAsRead).toHaveBeenCalledWith('1');
    h.markAsRead.mockReset();
    fireEvent.click(screen.getByText('act-unknown-1'));
    expect(h.push).not.toHaveBeenCalled();
    expect(h.markAsRead).not.toHaveBeenCalled();
    for (const [action, route] of Object.entries(routes)) {
      fireEvent.click(screen.getByText(`act-${action}-1`));
      expect(h.push).toHaveBeenLastCalledWith(route);
    }
    expect(h.markAsRead).toHaveBeenCalledTimes(5);
  });
});

describe('NotificationsPage', () => {
  it('renders empty tabs without mark-all button', () => {
    render(<NotificationsPage />);
    expect(screen.getByText('Notifications', { selector: 'h1' })).toBeInTheDocument();
    expect(screen.getByText('All (0)')).toBeInTheDocument();
    expect(screen.getByText('No notifications')).toBeInTheDocument();
    expect(screen.queryByText('Mark all as read')).toBeNull();
  });

  it('lists notifications per tab and handles actions', () => {
    h.notifications = [mk(1, 'unread'), mk(2, 'read')];
    render(<NotificationsPage />);
    expect(screen.getByText('All (2)')).toBeInTheDocument();
    expect(screen.getByText('Unread (1)')).toBeInTheDocument();
    expect(screen.getByText('Read (1)')).toBeInTheDocument();
    expect(screen.getAllByTestId('card')).toHaveLength(2);

    fireEvent.click(screen.getByText('Mark all as read'));
    expect(h.markAllAsRead).toHaveBeenCalled();

    fireEvent.click(screen.getAllByText('read-1')[0]);
    expect(h.markAsRead).toHaveBeenCalledWith('1');
    fireEvent.click(screen.getAllByText('act-unknown-1')[0]);
    expect(h.push).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByText('act-billing-1')[0]);
    expect(h.push).toHaveBeenCalledWith('/dashboard/billing');
    expect(h.markAsRead).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByText('Unread (1)'));
    expect(screen.getAllByText('Title 1').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText('Read (1)'));
    expect(screen.getAllByText('Title 2').length).toBeGreaterThan(0);
  });
});
