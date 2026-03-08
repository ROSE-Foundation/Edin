'use client';

import type { AnnouncementDto } from '@edin/shared';

interface AnnouncementListProps {
  announcements: AnnouncementDto[];
  currentUserId?: string;
  isAdmin?: boolean;
  onDelete?: (announcementId: string) => void;
  isDeletePending?: boolean;
}

export function AnnouncementList({
  announcements,
  currentUserId,
  isAdmin,
  onDelete,
  isDeletePending,
}: AnnouncementListProps) {
  if (announcements.length === 0) {
    return <p className="font-serif text-[14px] text-brand-secondary">No announcements yet.</p>;
  }

  return (
    <div className="space-y-[var(--spacing-sm)]" role="list" aria-label="Announcements">
      {announcements.map((announcement) => {
        const canDelete = onDelete && (announcement.authorId === currentUserId || isAdmin);

        return (
          <div
            key={announcement.id}
            role="listitem"
            className="rounded-[12px] border border-surface-border bg-surface-raised p-[var(--spacing-md)]"
          >
            <p className="font-sans text-[14px] leading-[1.6] text-brand-primary">
              {announcement.content}
            </p>
            <div className="mt-[var(--spacing-xs)] flex items-center justify-between">
              <p className="font-sans text-[12px] text-brand-secondary">
                {announcement.author?.name ?? 'Unknown'} &middot;{' '}
                {new Date(announcement.createdAt).toLocaleDateString()}
              </p>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(announcement.id)}
                  disabled={isDeletePending}
                  className="inline-flex min-h-[36px] min-w-[44px] items-center justify-center rounded-[8px] font-sans text-[12px] text-brand-secondary transition-colors duration-200 hover:bg-surface-sunken disabled:opacity-50"
                  aria-label={`Delete announcement from ${announcement.author?.name ?? 'Unknown'}`}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
