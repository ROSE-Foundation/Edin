'use client';

import { useNotifications, useMarkAllNotificationsRead } from '../../../hooks/use-notifications';
import { NotificationToast } from './notification-toast';
import type { NotificationCategory } from '@edin/shared';

interface NotificationInlineListProps {
  category: NotificationCategory;
}

export function NotificationInlineList({ category }: NotificationInlineListProps) {
  const { notifications, isPending } = useNotifications({ category });
  const markAllRead = useMarkAllNotificationsRead();

  const unreadNotifications = notifications.filter((n) => !n.read).slice(0, 5);

  if (isPending || unreadNotifications.length === 0) {
    return null;
  }

  return (
    <div
      className="mb-[var(--spacing-md)] rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-md)]"
      aria-live="polite"
    >
      <div className="mb-[var(--spacing-sm)] flex items-center justify-between">
        <p className="font-sans text-[13px] font-medium text-brand-secondary">New updates</p>
        <button
          type="button"
          onClick={() => markAllRead.mutate(category)}
          className="font-sans text-[13px] text-brand-accent hover:underline"
          disabled={markAllRead.isPending}
        >
          Dismiss all
        </button>
      </div>
      <div className="flex flex-col gap-[var(--spacing-xs)]">
        {unreadNotifications.map((notification) => (
          <NotificationToast key={notification.id} notification={notification} />
        ))}
      </div>
    </div>
  );
}
