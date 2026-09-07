import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationStore } from '@/features/notifications/utils/store';
import type { Notification } from '@/features/notifications/utils/store';

const initialNotifications = useNotificationStore.getState().notifications;

beforeEach(() => {
  useNotificationStore.setState({ notifications: initialNotifications });
  try {
    window.localStorage.clear();
  } catch {
    // jsdom storage unavailable
  }
});

describe('notification store', () => {
  it('starts with the mock notifications and three unread', () => {
    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(5);
    expect(state.notifications.map((n) => n.id)).toEqual(['1', '2', '3', '4', '5']);
    expect(state.unreadCount()).toBe(3);
  });

  it('marks a single notification as read', () => {
    useNotificationStore.getState().markAsRead('1');
    const state = useNotificationStore.getState();
    expect(state.notifications.find((n) => n.id === '1')?.status).toBe('read');
    expect(state.notifications.find((n) => n.id === '2')?.status).toBe('unread');
    expect(state.unreadCount()).toBe(2);
  });

  it('leaves everything unchanged when the id does not exist', () => {
    useNotificationStore.getState().markAsRead('does-not-exist');
    expect(useNotificationStore.getState().unreadCount()).toBe(3);
  });

  it('marking an already-read notification keeps it read', () => {
    useNotificationStore.getState().markAsRead('4');
    expect(useNotificationStore.getState().notifications.find((n) => n.id === '4')?.status).toBe(
      'read'
    );
    expect(useNotificationStore.getState().unreadCount()).toBe(3);
  });

  it('marks all notifications as read', () => {
    useNotificationStore.getState().markAllAsRead();
    const state = useNotificationStore.getState();
    expect(state.notifications.every((n) => n.status === 'read')).toBe(true);
    expect(state.unreadCount()).toBe(0);
  });

  it('removes a notification by id', () => {
    useNotificationStore.getState().removeNotification('2');
    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(4);
    expect(state.notifications.some((n) => n.id === '2')).toBe(false);
    expect(state.unreadCount()).toBe(2);
  });

  it('removing an unknown id keeps the list intact', () => {
    useNotificationStore.getState().removeNotification('nope');
    expect(useNotificationStore.getState().notifications).toHaveLength(5);
  });

  it('adds a new notification as unread at the top', () => {
    const incoming: Omit<Notification, 'status'> = {
      id: 'new-1',
      title: 'Deployment finished',
      body: 'Your app is live.',
      createdAt: new Date().toISOString()
    };
    useNotificationStore.getState().addNotification(incoming);
    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(6);
    expect(state.notifications[0]).toMatchObject({
      id: 'new-1',
      title: 'Deployment finished',
      status: 'unread'
    });
    expect(state.unreadCount()).toBe(4);
  });

  it('supports the full read flow after adding', () => {
    useNotificationStore.getState().addNotification({
      id: 'flow-1',
      title: 'Flow',
      body: 'Flow body',
      createdAt: new Date().toISOString()
    });
    expect(useNotificationStore.getState().unreadCount()).toBe(4);
    useNotificationStore.getState().markAsRead('flow-1');
    expect(useNotificationStore.getState().unreadCount()).toBe(3);
    useNotificationStore.getState().markAllAsRead();
    expect(useNotificationStore.getState().unreadCount()).toBe(0);
    useNotificationStore.getState().removeNotification('flow-1');
    expect(useNotificationStore.getState().notifications).toHaveLength(5);
  });
});
