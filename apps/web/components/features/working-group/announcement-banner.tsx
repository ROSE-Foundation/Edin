'use client';

import type { AnnouncementDto } from '@edin/shared';

interface AnnouncementBannerProps {
  announcement: AnnouncementDto | null;
  accentColor?: string;
}

export function AnnouncementBanner({ announcement, accentColor }: AnnouncementBannerProps) {
  if (!announcement) return null;

  const bgStyle = accentColor ? { backgroundColor: `${accentColor}1A` } : undefined;

  return (
    <div
      className="rounded-[12px] p-[var(--spacing-lg)]"
      style={bgStyle}
      role="region"
      aria-label="Latest announcement"
    >
      <p className="font-sans text-[14px] leading-[1.6] text-brand-primary">
        {announcement.content}
      </p>
      <p className="mt-[var(--spacing-sm)] font-sans text-[12px] text-brand-secondary">
        {announcement.author?.name ?? 'Unknown'} &middot;{' '}
        {new Date(announcement.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
}
