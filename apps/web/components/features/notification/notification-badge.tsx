'use client';

interface NotificationBadgeProps {
  visible: boolean;
  ariaLabel?: string;
}

export function NotificationBadge({
  visible,
  ariaLabel = 'New notifications',
}: NotificationBadgeProps) {
  if (!visible) return null;

  return (
    <span
      className="animate-pulse-once absolute right-[8px] top-1/2 h-[8px] w-[8px] -translate-y-1/2 rounded-full bg-accent-primary"
      aria-label={ariaLabel}
    />
  );
}
