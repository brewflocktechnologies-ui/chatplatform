'use client';

import { NotificationCard } from '@/components/ui/notification-card';
import { useRouter } from 'next/navigation';
import { useNotificationStore, type Notification } from '../utils/store';

const actionRoutes: Record<string, string> = {
  view: '/dashboard/workspaces',
  'view-product': '/dashboard/product',
  billing: '/dashboard/billing',
  open: '/dashboard/overview',
  'open-chat': '/dashboard/chat'
};

// The notification cards shared by the bell popover and the notifications page. An action
// marks the notification read and navigates to its route.
export function NotificationCards({ items }: Readonly<{ items: Notification[] }>) {
  const { markAsRead } = useNotificationStore();
  const router = useRouter();

  return items.map((notification) => (
    <NotificationCard
      key={notification.id}
      id={notification.id}
      title={notification.title}
      body={notification.body}
      status={notification.status}
      createdAt={notification.createdAt}
      actions={notification.actions}
      onMarkAsRead={markAsRead}
      onAction={(notifId, actionId) => {
        const route = actionRoutes[actionId];
        if (route) {
          markAsRead(notifId);
          router.push(route);
        }
      }}
    />
  ));
}
